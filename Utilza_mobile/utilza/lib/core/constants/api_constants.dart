// API configuration. Override with:
// flutter run --dart-define=API_BASE_URL=https://<host>/api/v1
// Default = this PC's LAN address so a physical Android phone on the
// same Wi-Fi reaches the local backend with a plain `flutter run`.
// (`localhost` would mean the phone itself.) If the Wi-Fi reconnects
// and the PC gets a new IP, update the default below.
class ApiConstants {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://198.18.0.1:4000/api/v1',
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
