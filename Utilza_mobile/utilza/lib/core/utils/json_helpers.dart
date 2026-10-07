/// ISO-8601 helpers. Backend dates are strings; IDs are opaque.
DateTime? tryParseDate(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  if (value is String && value.isNotEmpty) {
    return DateTime.tryParse(value);
  }
  return null;
}

String stringOf(Map<String, dynamic> json, String key,
    {String fallback = ''}) {
  final v = json[key];
  if (v == null) return fallback;
  return v.toString();
}

String? nullableStringOf(Map<String, dynamic> json, String key) {
  final v = json[key];
  if (v == null) return null;
  return v.toString();
}

int intOf(Map<String, dynamic> json, String key, {int fallback = 0}) {
  final v = json[key];
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v) ?? fallback;
  return fallback;
}

int? nullableIntOf(Map<String, dynamic> json, String key) {
  final v = json[key];
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}

bool boolOf(Map<String, dynamic> json, String key, {bool fallback = false}) {
  final v = json[key];
  if (v is bool) return v;
  if (v is String) {
    final lower = v.toLowerCase();
    if (lower == 'true') return true;
    if (lower == 'false') return false;
  }
  if (v is num) return v != 0;
  return fallback;
}

List<T> listOf<T>(dynamic value, T Function(dynamic) map) {
  if (value is! List) return <T>[];
  return value.map(map).toList();
}
