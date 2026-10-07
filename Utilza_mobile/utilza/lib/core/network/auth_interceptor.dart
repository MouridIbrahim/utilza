import 'package:dio/dio.dart';

/// Injects `Authorization: Bearer <token>` when a token exists.
/// Skips when `extra['auth'] == false` (e.g. public analytics/health
/// and unauthenticated generated-file downloads).
/// On 401, clears local auth via [onUnauthorized]; never retries.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this._getToken,
    required this._onUnauthorized,
  });

  final Future<String?> Function() _getToken;
  final Future<void> Function() _onUnauthorized;

  static const String authExtraKey = 'auth';

  static bool isAuthEnabled(RequestOptions options) =>
      options.extra[authExtraKey] != false;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (isAuthEnabled(options)) {
      final token = await _getToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final status = err.response?.statusCode;
    if (status == 401 && isAuthEnabled(err.requestOptions)) {
      // Avoid handling the same 401 twice (no refresh flow exists).
      if (err.requestOptions.extra['auth.handled401'] != true) {
        err.requestOptions.extra['auth.handled401'] = true;
        await _onUnauthorized();
      }
    }
    handler.next(err);
  }
}
