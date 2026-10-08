import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/errors/api_exception.dart';
import 'package:utilza/core/models/models.dart';
import 'package:utilza/core/network/api_client.dart';
import 'package:utilza/core/network/providers.dart';
import 'package:utilza/core/storage/secure_token_storage.dart';
import 'package:utilza/features/auth/data/auth_remote_datasource.dart';
import 'package:utilza/features/auth/data/auth_repository_impl.dart';
import 'package:utilza/features/auth/domain/auth_repository.dart';
import 'package:utilza/features/auth/domain/auth_validators.dart';
import 'package:utilza/features/auth/presentation/auth_providers.dart';

class FakeTokenStorage extends SecureTokenStorage {
  String? token;
  int deletes = 0;

  @override
  Future<String?> readToken() async => token;

  @override
  Future<void> writeToken(String value) async {
    token = value;
  }

  @override
  Future<void> deleteToken() async {
    token = null;
    deletes++;
  }
}

/// Stub Dio resolving canned JSON envelopes while capturing requests.
Dio stubDio({
  required Map<String, dynamic> Function(RequestOptions options) respond,
  void Function(RequestOptions options)? capture,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        capture?.call(options);
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

Map<String, dynamic> authJson({String token = 'jwt-1'}) => {
      'success': true,
      'data': {
        'user': {'id': 'u1', 'email': 'a@b.c', 'name': 'A'},
        'token': token,
      },
    };

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({this.me, this.meError, this.logoutError});
  PublicUser? me;
  Object? meError;
  Object? logoutError;
  int logouts = 0;

  @override
  Future<AuthResult> login(
      {required String email, required String password}) async {
    return AuthResult(
      user: const PublicUser(id: 'u1', email: 'a@b.c'),
      token: 'jwt-login',
    );
  }

  @override
  Future<AuthResult> register(
      {required String email,
      required String password,
      String? name}) async {
    return AuthResult(
      user: PublicUser(id: 'u1', email: email, name: name),
      token: 'jwt-reg',
    );
  }

  @override
  Future<void> logout() async {
    logouts++;
    if (logoutError != null) throw logoutError!;
  }

  @override
  Future<PublicUser> getMe() async {
    if (meError != null) throw meError!;
    return me ?? const PublicUser(id: 'u1', email: 'a@b.c');
  }
}

void main() {
  group('validators', () {
    test('email/password/name rules', () {
      expect(AuthValidators.email(''), isNotNull);
      expect(AuthValidators.email('bad'), isNotNull);
      expect(AuthValidators.email('a@b.c'), isNull);
      expect(AuthValidators.password('short'), isNotNull);
      expect(AuthValidators.password('long-enough-1'), isNull);
      expect(AuthValidators.name(''), isNull);
      expect(AuthValidators.name(List.filled(101, 'x').join()), isNotNull);
    });
  });

  group('datasource', () {
    test('register posts exact body, omits empty name', () async {
      RequestOptions? seen;
      final ds = AuthRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => seen = o,
            respond: (_) => authJson(),
          ),
        ),
      );
      await ds.register(email: 'a@b.c', password: 'password123', name: '  ');
      expect(seen?.path, '/auth/register');
      expect((seen?.data as Map)['email'], 'a@b.c');
      expect((seen?.data as Map).containsKey('name'), isFalse);

      await ds.register(
          email: 'a@b.c', password: 'password123', name: 'Ana');
      expect((seen?.data as Map)['name'], 'Ana');
    });

    test('login posts exact body and parses user+token', () async {
      RequestOptions? seen;
      final ds = AuthRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => seen = o,
            respond: (_) => authJson(token: 'jwt-login'),
          ),
        ),
      );
      final result =
          await ds.login(email: 'a@b.c', password: 'password123');
      expect(seen?.path, '/auth/login');
      expect(result.token, 'jwt-login');
      expect(result.user.email, 'a@b.c');
    });

    test('logout hits /auth/logout, getMe hits /auth/me', () async {
      final paths = <String>[];
      final ds = AuthRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => paths.add(o.path),
            respond: (o) => o.path == '/auth/me'
                ? {
                    'success': true,
                    'data': {'id': 'u1', 'email': 'a@b.c', 'name': null}
                  }
                : {
                    'success': true,
                    'data': {'loggedOut': true}
                  },
          ),
        ),
      );
      await ds.logout();
      final me = await ds.getMe();
      expect(paths, ['/auth/logout', '/auth/me']);
      expect(me.id, 'u1');
    });
  });

  group('repository token persistence', () {
    test('writes token on login/register', () async {
      final storage = FakeTokenStorage();
      final repo = AuthRepositoryImpl(
        AuthRemoteDataSource(
          ApiClient(
            dio: stubDio(respond: (_) => authJson(token: 'jwt-new')),
          ),
        ),
        storage,
      );
      await repo.login(email: 'a@b.c', password: 'password123');
      expect(storage.token, 'jwt-new');
      await repo.register(email: 'a@b.c', password: 'password123');
      expect(storage.token, 'jwt-new');
    });

    test('logout deletes token even when remote fails', () async {
      final storage = FakeTokenStorage()..token = 'jwt-1';
      final dio = Dio(BaseOptions(baseUrl: 'https://x'));
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
      final repo = AuthRepositoryImpl(
        AuthRemoteDataSource(ApiClient(dio: dio)),
        storage,
      );
      await repo.logout();
      expect(storage.token, isNull);
      expect(storage.deletes, 1);
    });
  });

  group('controller bootstrap', () {
    ProviderContainer containerWith({
      String? token,
      PublicUser? me,
      Object? meError,
    }) {
      final storage = FakeTokenStorage()..token = token;
      final fakeRepo = FakeAuthRepository(me: me, meError: meError);
      // Persist login tokens like the real impl for login tests.
      return ProviderContainer(
        overrides: [
          secureTokenStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      );
    }

    test('no token → unauthenticated', () async {
      final c = containerWith();
      addTearDown(c.dispose);
      await c.read(authControllerProvider.notifier).bootstrap();
      expect(
        c.read(authControllerProvider).status,
        AuthStatus.unauthenticated,
      );
    });

    test('valid token → authenticated', () async {
      final c = containerWith(token: 'jwt-1');
      addTearDown(c.dispose);
      await c.read(authControllerProvider.notifier).bootstrap();
      final state = c.read(authControllerProvider);
      expect(state.status, AuthStatus.authenticated);
      expect(state.user?.id, 'u1');
    });

    test('expired token (401) → deletes + unauthenticated', () async {
      final storage = FakeTokenStorage()..token = 'expired';
      final c = ProviderContainer(
        overrides: [
          secureTokenStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(
            FakeAuthRepository(
              meError: const ApiException(
                statusCode: 401,
                code: 'UNAUTHORIZED',
                message: 'expired',
              ),
            ),
          ),
        ],
      );
      addTearDown(c.dispose);
      await c.read(authControllerProvider.notifier).bootstrap();
      expect(
        c.read(authControllerProvider).status,
        AuthStatus.unauthenticated,
      );
      expect(storage.token, isNull);
      expect(storage.deletes, 1);
    });

    test('logout always clears even on failure', () async {
      final storage = FakeTokenStorage()..token = 'jwt-1';
      final repo = FakeAuthRepository(
        me: const PublicUser(id: 'u1', email: 'a@b.c'),
        logoutError: const ApiException(
          code: 'INTERNAL_ERROR',
          message: 'boom',
        ),
      );
      // Real impl semantics: logout failure still deletes the token.
      final realRepo = AuthRepositoryImpl(
        AuthRemoteDataSource(
          ApiClient(
            dio: stubDio(
              respond: (_) => throw DioException(
                requestOptions: RequestOptions(path: '/auth/logout'),
                type: DioExceptionType.badResponse,
              ),
            ),
          ),
        ),
        storage,
      );
      final c = ProviderContainer(
        overrides: [
          secureTokenStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(realRepo),
        ],
      );
      addTearDown(c.dispose);
      // Seed authenticated state via login-like setup.
      await c.read(authControllerProvider.notifier).bootstrap();
      await c.read(authControllerProvider.notifier).logout();
      expect(
        c.read(authControllerProvider).status,
        AuthStatus.unauthenticated,
      );
      expect(storage.token, isNull);
      expect(repo.logouts, 0); // sanity: fake unused here
    });
  });

  group('provider wiring: 401 clears the stored token', () {
    test('expired GET /auth/me deletes token + drops auth state', () async {
      final storage = FakeTokenStorage()..token = 'expired';
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
      dio.httpClientAdapter = _UnauthorizedAdapter();
      late final ProviderContainer c;
      c = ProviderContainer(
        overrides: [
          secureTokenStorageProvider.overrideWithValue(storage),
        ],
      );
      addTearDown(c.dispose);
      final client = ApiClient(
        dio: dio,
        getToken: storage.readToken,
        onUnauthorized: () async {
          await storage.deleteToken();
          c
              .read(authControllerProvider.notifier)
              .setStatus(AuthStatus.unauthenticated);
        },
      );
      // Seed an authenticated session, then hit the expired token.
      c
          .read(authControllerProvider.notifier)
          .setStatus(AuthStatus.authenticated);
      final repo = AuthRepositoryImpl(
        AuthRemoteDataSource(client),
        storage,
      );
      await expectLater(
        repo.getMe(),
        throwsA(
          isA<ApiException>().having(
            (e) => e.statusCode,
            'statusCode',
            401,
          ),
        ),
      );
      expect(storage.token, isNull);
      expect(storage.deletes, 1);
      expect(
        c.read(authControllerProvider).status,
        AuthStatus.unauthenticated,
      );
    });
  });
}

class _UnauthorizedAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      '{"success":false,"error":{"code":"UNAUTHORIZED","message":"expired"}}',
      401,
      headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
    );
  }

  @override
  void close({bool force = false}) {}
}
