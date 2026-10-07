import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';

/// Exact backend auth routes. No refresh, no cookies, no OTP/social.
class AuthRemoteDataSource {
  AuthRemoteDataSource(this._client);
  final ApiClient _client;

  Future<AuthResult> register({
    required String email,
    required String password,
    String? name,
  }) {
    final body = <String, dynamic>{'email': email, 'password': password};
    final trimmed = (name ?? '').trim();
    if (trimmed.isNotEmpty) body['name'] = trimmed;
    return _client.post<AuthResult>(
      '/auth/register',
      body: body,
      fromData: (data) => AuthResult.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
    );
  }

  Future<AuthResult> login({
    required String email,
    required String password,
  }) {
    return _client.post<AuthResult>(
      '/auth/login',
      body: {'email': email, 'password': password},
      fromData: (data) => AuthResult.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
    );
  }

  /// No auth technically required. Returns `{loggedOut:true}`.
  Future<void> logout() {
    return _client.post<void>(
      '/auth/logout',
      fromData: (_) {},
    );
  }

  Future<PublicUser> getMe() {
    return _client.get<PublicUser>(
      '/auth/me',
      fromData: (data) => PublicUser.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
    );
  }
}
