// API configuration. Never hardcode a production URL.
// Provide via: flutter run --dart-define=API_BASE_URL=https://<host>/api/v1
class ApiConstants {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 60);
  static const Duration sendTimeout = Duration(seconds: 60);

  /// Server origin derived from the API base, e.g.
  /// https://example.com/api/v1 -> https://example.com
  static String get serverOrigin {
    final uri = Uri.parse(apiBaseUrl);
    final origin = '${uri.scheme}://${uri.host}'
        '${uri.hasPort ? ':${uri.port}' : ''}';
    return origin;
  }

  static String get healthUrl => '$serverOrigin/health';
  static String get apiHealthUrl => '$apiBaseUrl/health';

  static const String multipartFieldFiles = 'files';
  // Exception: generic validator uses singular `file`.
  static const String multipartFieldSingleFile = 'file';
}
