import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/errors/api_exception.dart';
import 'package:utilza/core/models/models.dart';
import 'package:utilza/core/network/api_client.dart';
import 'package:utilza/features/favorites/data/favorite_remote_datasource.dart';
import 'package:utilza/features/favorites/data/favorite_repository_impl.dart';
import 'package:utilza/features/favorites/domain/favorite_repository.dart';
import 'package:utilza/features/favorites/presentation/favorite_providers.dart';
import 'package:utilza/features/history/data/history_remote_datasource.dart';
import 'package:utilza/features/history/data/history_repository_impl.dart';
import 'package:utilza/features/history/presentation/history_providers.dart';
import 'package:utilza/features/profile/data/profile_remote_datasource.dart';
import 'package:utilza/features/profile/data/profile_repository_impl.dart';
import 'package:utilza/features/subscription/data/subscription_remote_datasource.dart';
import 'package:utilza/features/subscription/data/subscription_repository_impl.dart';

Dio stubDio({
  required Map<String, dynamic> Function(RequestOptions options) respond,
  void Function(RequestOptions options)? capture,
  void Function(RequestOptions options)? failWith,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        capture?.call(options);
        if (failWith != null) {
          failWith(options);
        }
        handler.resolve(
          Response(
            requestOptions: options,
            statusCode: 200,
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

class FakeFavorites implements FavoriteRepository {
  FakeFavorites({this.items = const [], this.addError});
  List<Favorite> items;
  Object? addError;
  final List<String> addedIds = [];
  final List<String> removedIds = [];

  @override
  Future<Favorite> addFavorite(String toolId) async {
    addedIds.add(toolId);
    if (addError != null) throw addError!;
    final fav = Favorite.fromJson(
      (favJson(toolId)['data']) as Map<String, dynamic>,
    );
    items = [...items, fav];
    return fav;
  }

  @override
  Future<List<Favorite>> getFavorites() async => items;

  @override
  Future<void> removeFavorite(String toolId) async {
    removedIds.add(toolId);
    items = items.where((f) => f.toolId != toolId).toList();
  }
}

void main() {
  group('favorites', () {
    test('loads list envelope', () async {
      final ds = FavoriteRemoteDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {
                'items': [
                  (favJson('tool-id-1')['data']),
                ]
              },
            },
          ),
        ),
      );
      final items = await ds.getFavorites();
      expect(items.single.toolId, 'tool-id-1');
    });

    test('add uses tool id in body (never slug-derived)', () async {
      RequestOptions? seen;
      final ds = FavoriteRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => seen = o,
            respond: (_) => favJson('tool-id-123'),
          ),
        ),
      );
      await ds.addFavorite('tool-id-123');
      expect(seen?.path, '/favorites');
      expect((seen?.data as Map)['toolId'], 'tool-id-123');
    });

    test('remove is idempotent on 404', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://x'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, h) => h.reject(
            DioException(
              requestOptions: o,
              type: DioExceptionType.badResponse,
              response: Response(
                requestOptions: o,
                statusCode: 404,
                data: {
                  'success': false,
                  'error': {'code': 'NOT_FOUND', 'message': 'gone'}
                },
              ),
            ),
          ),
        ),
      );
      final repo = FavoriteRepositoryImpl(
        FavoriteRemoteDataSource(ApiClient(dio: dio)),
      );
      await repo.removeFavorite('tool-id-1'); // must not throw
    });

    test('duplicate 409 reconciles via reload', () async {
      final fake = FakeFavorites(
        addError: const ApiException(
          statusCode: 409,
          code: 'ALREADY_FAVORITED',
          message: 'dup',
        ),
      );
      final c = ProviderContainer(
        overrides: [
          favoriteRepositoryProvider.overrideWithValue(fake),
        ],
      );
      addTearDown(c.dispose);
      await c
          .read(favoritesControllerProvider.notifier)
          .toggle('tool-id-1');
      expect(fake.addedIds, ['tool-id-1']);
      // Controller swallowed 409 and reloaded instead of throwing.
      expect(c.read(favoritesControllerProvider).errorMessage, isNull);
    });
  });

  group('history', () {
    test('loads paginated newest-first envelope', () async {
      final ds = HistoryRemoteDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {
                'items': [
                  {
                    'id': 'h1',
                    'toolSlug': 'pdf-merge',
                    'inputSummary': '2 files',
                    'createdAt': '2026-01-02T00:00:00.000Z',
                  }
                ],
                'page': 1,
                'limit': 20,
                'total': 1,
              }
            },
          ),
        ),
      );
      final page = await ds.getHistory();
      expect(page.items.single.toolSlug, 'pdf-merge');
      expect(page.total, 1);
    });

    test('create truncates summary to 500 and omits empty', () async {
      RequestOptions? seen;
      final ds = HistoryRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => seen = o,
            respond: (_) => {
              'success': true,
              'data': {'id': 'h1', 'toolSlug': 'pdf-merge'}
            },
          ),
        ),
      );
      await ds.createHistory(
        toolSlug: 'pdf-merge',
        inputSummary: List.filled(600, 'x').join(),
      );
      expect(((seen?.data as Map)['inputSummary'] as String).length, 500);
      await ds.createHistory(toolSlug: 'pdf-merge', inputSummary: '   ');
      expect((seen?.data as Map).containsKey('inputSummary'), isFalse);
    });

    test('controller paginates and clears', () async {
      final c = ProviderContainer(
        overrides: [
          historyRepositoryProvider.overrideWithValue(
            HistoryRepositoryImpl(
              HistoryRemoteDataSource(
                ApiClient(
                  dio: stubDio(
                    respond: (o) {
                      final page =
                          (o.queryParameters['page'] as int?) ?? 1;
                      if (page == 1) {
                        return {
                          'success': true,
                          'data': {
                            'items': [
                              {'id': 'h1', 'toolSlug': 'a'},
                              {'id': 'h2', 'toolSlug': 'b'},
                            ],
                            'page': 1,
                            'limit': 2,
                            'total': 3,
                          }
                        };
                      }
                      return {
                        'success': true,
                        'data': {
                          'items': [
                            {'id': 'h3', 'toolSlug': 'c'}
                          ],
                          'page': 2,
                          'limit': 2,
                          'total': 3,
                        }
                      };
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      );
      addTearDown(c.dispose);
      await c.read(historyControllerProvider.notifier).loadFirst();
      expect(c.read(historyControllerProvider).hasMore, isTrue);
      await c.read(historyControllerProvider.notifier).loadMore();
      expect(c.read(historyControllerProvider).items.length, 3);
    });
  });

  group('profile + subscription', () {
    test('profile get/update/delete hit exact routes', () async {
      final paths = <String>[];
      final ds = ProfileRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => paths.add('${o.method} ${o.path}'),
            respond: (o) {
              if (o.path == '/users/me' && o.method == 'GET') {
                return {
                  'success': true,
                  'data': {'id': 'u1', 'email': 'a@b.c', 'name': 'A'}
                };
              }
              if (o.path == '/users/me' && o.method == 'PATCH') {
                return {
                  'success': true,
                  'data': {'id': 'u1', 'email': 'a@b.c', 'name': 'B'}
                };
              }
              return {
                'success': true,
                'data': {'deleted': true}
              };
            },
          ),
        ),
      );
      final repo = ProfileRepositoryImpl(ds);
      expect((await repo.getProfile()).email, 'a@b.c');
      expect((await repo.updateName('  B  ')).name, 'B');
      await repo.deleteAccount();
      expect(paths, ['GET /users/me', 'PATCH /users/me', 'DELETE /users/me']);
    });

    test('subscription parses free fallback', () async {
      final ds = SubscriptionRemoteDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {'status': 'free', 'tier': 'free'}
            },
          ),
        ),
      );
      final repo = SubscriptionRepositoryImpl(ds);
      expect((await repo.getMySubscription()).isFree, isTrue);
    });
  });
}
