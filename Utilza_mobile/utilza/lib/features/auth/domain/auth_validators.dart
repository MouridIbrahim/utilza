/// Client-side UX validation. Backend remains authoritative.
abstract final class AuthValidators {
  static final _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  static String? email(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return 'Email is required.';
    if (v.length > 255) return 'Email must be at most 255 characters.';
    if (!_emailPattern.hasMatch(v)) return 'Enter a valid email.';
    return null;
  }

  static String? password(String? value) {
    final v = value ?? '';
    if (v.isEmpty) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    if (v.length > 128) return 'Password must be at most 128 characters.';
    return null;
  }

  static String? name(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return null; // optional
    if (v.length > 100) {
      return 'Name must be 1–100 characters.';
    }
    return null;
  }
}
