import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/errors/api_exception.dart';
import 'package:utilza/core/network/api_client.dart';
import 'package:utilza/features/admin/data/admin_remote_datasource.dart';
import 'package:utilza/features/admin/domain/admin_models.dart';
import 'package:utilza/features/admin/presentation/admin_providers.dart';

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

Dio forbiddenDio() {
  final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (o, h) => h.reject(
        DioException(
          requestOptions: o,
          type: DioExceptionType.badResponse,
          response: Response(
            requestOptions: o,
            statusCode: 403,
            data: {
              'success': false,
              'error': {'code': 'FORBIDDEN', 'message': 'denied'}
            },
          ),
        ),
      ),
    ),
  );
  return dio;
}

void main() {
  group('admin listing (read-only, server-gated)', () {
    test('hits exact paths, clamps limit to 100, omits empty search',
        () async {
      Map<String, dynamic>? seenTools;
      String? toolsPath;
      final ds = AdminRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) {
              toolsPath = o.path;
              seenTools = Map.of(o.queryParameters);
            },
            respond: (_) => {
              'success': true,
              'data': {
                'items': [
                  {
                    'id': 't1',
                    'name': 'Merge',
                    'slug': 'pdf-merge',
                    'isActive': true,
                    'categoryId': 'c1',
                    'sortOrder': 1,
                  }
                ],
                'page': 1,
                'limit': 100,
                'total': 1,
              }
            },
          ),
        ),
      );
      final page = await ds.getTools(limit: 500, search: '  ');
      expect(toolsPath, '/admin/tools');
      expect(seenTools?['limit'], 100);
      expect(seenTools?.containsKey('search'), isFalse);
      expect(page.items.single, isA<AdminTool>());
      expect(page.items.single.slug, 'pdf-merge');
    });

    test('users parse id/email/name rows', () async {
      final ds = AdminRemoteDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {
                'items': [
                  {'id': 'u1', 'email': 'a@b.c', 'name': 'A'}
                ],
                'page': 1,
                'limit': 20,
                'total': 1,
              }
            },
          ),
        ),
      );
      final page = await ds.getUsers(search: 'a@');
      expect(page.items.single, isA<AdminUser>());
      expect(page.items.single.email, 'a@b.c');
    });

    test('models carry no local role field', () {
      final tool = AdminTool.fromJson({
        'id': 't1',
        'name': 'N',
        'slug': 's',
        'role': 'admin', // unknown keys are ignored
      });
      expect(tool.slug, 's');
      final user = AdminUser.fromJson({
        'id': 'u1',
        'email': 'a@b.c',
        'role': 'admin',
      });
      expect(user.email, 'a@b.c');
    });
  });

  group('403 handling (backend decides, never local email checks)', () {
    test('tools 403 surfaces access-denied without a local role', () async {
      final c = ProviderContainer(
        overrides: [
          adminRemoteDataSourceProvider.overrideWithValue(
            AdminRemoteDataSource(ApiClient(dio: forbiddenDio())),
          ),
        ],
      );
      addTearDown(c.dispose);
      // No email/role is supplied anywhere in this call.
      await c.read(adminToolsControllerProvider.notifier).loadFirst();
      final state = c.read(adminToolsControllerProvider);
      expect(state.accessDenied, isTrue);
      expect(state.items, isEmpty);
    });

    test('users 403 surfaces access-denied', () async {
      final c = ProviderContainer(
        overrides: [
          adminRemoteDataSourceProvider.overrideWithValue(
            AdminRemoteDataSource(ApiClient(dio: forbiddenDio())),
          ),
        ],
      );
      addTearDown(c.dispose);
      await c.read(adminUsersControllerProvider.notifier).loadFirst();
      expect(c.read(adminUsersControllerProvider).accessDenied, isTrue);
    });

    test('non-403 errors surface as retryable messages', () async {
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
      final c = ProviderContainer(
        overrides: [
          adminRemoteDataSourceProvider.overrideWithValue(
            AdminRemoteDataSource(ApiClient(dio: dio)),
          ),
        ],
      );
      addTearDown(c.dispose);
      await c.read(adminToolsControllerProvider.notifier).loadFirst();
      final state = c.read(adminToolsControllerProvider);
      expect(state.accessDenied, isFalse);
      expect(state.errorMessage, isNotNull);
    });

    test('ApiException preserves 403 for mappers', () {
      const e = ApiException(
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'denied',
      );
      expect(e.statusCode, 403);
    });
  });
}
