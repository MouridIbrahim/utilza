import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/constants/analytics_events.dart';
import 'package:utilza/core/models/models.dart';
import 'package:utilza/core/network/api_client.dart';
import 'package:utilza/features/analytics/data/analytics_remote_datasource.dart';
import 'package:utilza/features/analytics/data/health_remote_datasource.dart';
import 'package:utilza/features/analytics/presentation/analytics_providers.dart';
import 'package:utilza/features/favorites/domain/favorite_repository.dart';
import 'package:utilza/features/favorites/presentation/favorite_providers.dart';

Dio stubDio({
  required Map<String, dynamic> Function(RequestOptions options) respond,
  void Function(RequestOptions options)? capture,
  int statusCode = 200,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        capture?.call(options);
        handler.resolve(
          Response(
            requestOptions: options,
            statusCode: statusCode,
            data: respond(options),
          ),
        );
      },
    ),
  );
  return dio;
}

Map<String, dynamic> favJson(String toolId) => {
      'success': true,
      'data': {
        'id': 'f-$toolId',
        'userId': 'u1',
        'toolId': toolId,
        'createdAt': '2026-01-01T00:00:00.000Z',
        'tool': {'id': toolId, 'name': 'N', 'slug': 's', 'icon': null},
      },
    };

class _RecordingAnalytics extends AnalyticsRemoteDataSource {
  _RecordingAnalytics() : super(ApiClient(dio: Dio()));
  final List<Map<String, String?>> events = [];

  @override
  Future<void> logEvent(String event, {String? toolSlug}) async {
    events.add({'event': event, 'toolSlug': toolSlug});
  }
}

class _FakeFavorites implements FavoriteRepository {
  List<Favorite> items = [];
  @override
  Future<Favorite> addFavorite(String toolId) async {
    final fav = Favorite.fromJson(
      favJson(toolId)['data'] as Map<String, dynamic>,
    );
    items = [...items, fav];
    return fav;
  }

  @override
  Future<List<Favorite>> getFavorites() async => items;

  @override
  Future<void> removeFavorite(String toolId) async {
    items = items.where((f) => f.toolId != toolId).toList();
  }
}

void main() {
  group('analytics contract', () {
    test('all 8 allowlisted events transmit; others are dropped', () async {
      final bodies = <Map>[];
      final ds = AnalyticsRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => bodies.add(Map.of(o.data as Map)),
            respond: (_) => {
              'success': true,
              'data': {'recorded': true}
            },
          ),
        ),
      );
      for (final event in AnalyticsEvents.values) {
        await ds.logEvent(event, toolSlug: 'pdf-merge');
      }
      expect(bodies.length, 8);
      await ds.logEvent('user_email_captured', toolSlug: 'x');
      await ds.logEvent('', toolSlug: 'x');
      expect(bodies.length, 8, reason: 'unknown events must not transmit');
    });

    test('body carries no PII and platform is never web from the app',
        () async {
      Map? body;
      final ds = AnalyticsRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => body = Map.of(o.data as Map),
            respond: (_) => {
              'success': true,
              'data': {'recorded': true}
            },
          ),
        ),
      );
      await ds.logEvent(AnalyticsEvents.toolOpened, toolSlug: 'pdf-merge');
      expect(Set.of(body!.keys), {'event', 'toolSlug', 'platform'});
      expect(body!['platform'], isNot('web'));
      expect(body.toString(), isNot(contains('@')));
    });

    test('requests are unauthenticated even with a token present', () async {
      String? captured = 'unset';
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, handler) {
            captured = o.headers['Authorization']?.toString();
            handler.resolve(
              Response(
                requestOptions: o,
                statusCode: 200,
                data: {
                  'success': true,
                  'data': {'recorded': true}
                },
              ),
            );
          },
        ),
      );
      final ds = AnalyticsRemoteDataSource(
        ApiClient(
          dio: dio,
          getToken: () async => 'jwt-123',
          onUnauthorized: () async {},
        ),
      );
      await ds.logEvent(AnalyticsEvents.searchPerformed);
      expect(captured, isNull);
    });

    test('server failure never throws (fire-and-forget)', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, h) => h.reject(
            DioException(
              requestOptions: o,
              type: DioExceptionType.badResponse,
              response: Response(
                requestOptions: o,
                statusCode: 500,
                data: {
                  'success': false,
                  'error': {'code': 'INTERNAL_ERROR', 'message': 'boom'}
                },
              ),
            ),
          ),
        ),
      );
      final ds = AnalyticsRemoteDataSource(ApiClient(dio: dio));
      await ds.logEvent(AnalyticsEvents.toolFailed, toolSlug: 'x');
    });

    test('favoriting logs tool_favorited', () async {
      final analytics = _RecordingAnalytics();
      final c = ProviderContainer(
        overrides: [
          analyticsProvider.overrideWithValue(analytics),
          favoriteRepositoryProvider.overrideWithValue(_FakeFavorites()),
        ],
      );
      addTearDown(c.dispose);
      await c.read(favoritesControllerProvider.notifier).toggle('tool-1');
      expect(
        analytics.events.any(
          (e) => e['event'] == 'tool_favorited' && e['toolSlug'] == 's',
        ),
        isTrue,
      );
    });
  });

  group('health diagnostics', () {
    test('liveness + api health parse, db:false stays alive', () async {
      final paths = <String>[];
      final ds = HealthRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => paths.add(o.uri.toString()),
            respond: (o) => o.uri.toString().endsWith('/api/v1/health')
                ? {
                    'success': true,
                    'data': {
                      'status': 'ok',
                      'uptime': 123,
                      'db': false,
                      'version': '0.1.0',
                    }
                  }
                : {
                    'success': true,
                    'data': {'status': 'ok', 'uptime': 123}
                  },
          ),
        ),
      );
      final live = await ds.liveness();
      final api = await ds.apiHealth();
      expect(paths[0], endsWith('/health'));
      expect(paths[1], endsWith('/api/v1/health'));
      expect(live.isOk, isTrue);
      expect(api.isOk, isTrue);
      expect(api.dbReachable, isFalse);
      expect(api.version, '0.1.0');
    });
  });
}
