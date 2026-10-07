import '../../../core/models/models.dart';
import '../../../core/storage/secure_token_storage.dart';
import '../domain/auth_repository.dart';
import 'auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._remote, this._storage);
  final AuthRemoteDataSource _remote;
  final SecureTokenStorage _storage;

  @override
  Future<AuthResult> register({
    required String email,
    required String password,
    String? name,
  }) async {
    final result = await _remote.register(
      email: email,
      password: password,
      name: name,
    );
    await _storage.writeToken(result.token);
    return result;
  }

  @override
  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final result = await _remote.login(email: email, password: password);
    await _storage.writeToken(result.token);
    return result;
  }

  @override
  Future<void> logout() async {
    try {
      await _remote.logout();
    } catch (_) {
      // Best-effort: local state is always cleared below.
    }
    await _storage.deleteToken();
  }

  @override
  Future<PublicUser> getMe() => _remote.getMe();
}
