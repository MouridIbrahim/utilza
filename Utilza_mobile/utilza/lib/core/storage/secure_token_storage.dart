import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// OS-backed JWT storage. Never use SharedPreferences for the token,
/// never log it, never put it in URLs/analytics/crash reports.
class SecureTokenStorage {
  SecureTokenStorage([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  static const String key = 'utilza_jwt';
  final FlutterSecureStorage _storage;

  Future<String?> readToken() => _storage.read(key: key);

  Future<void> writeToken(String token) =>
      _storage.write(key: key, value: token);

  Future<void> deleteToken() => _storage.delete(key: key);
}
