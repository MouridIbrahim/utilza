import '../../../core/models/models.dart';

/// Auth operations. Token persistence is handled by the implementation.
abstract class AuthRepository {
  Future<AuthResult> register({
    required String email,
    required String password,
    String? name,
  });

  Future<AuthResult> login({
    required String email,
    required String password,
  });

  /// Calls POST /auth/logout (best-effort) and always clears local auth,
  /// even if the request fails. Server does NOT revoke the JWT.
  Future<void> logout();

  Future<PublicUser> getMe();
}
