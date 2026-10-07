import '../constants/api_constants.dart';

/// Resolves backend `downloadUrl` values against the server origin.
///
/// Backend may return `/api/v1/files/<id>`. Naively joining that onto
/// `https://host/api/v1` would produce `/api/v1/api/v1/...`.
/// Always resolve against the origin instead.
String resolveDownloadUrl(String downloadUrl, {String? apiBaseUrl}) {
  final trimmed = downloadUrl.trim();
  if (trimmed.isEmpty) return trimmed;
  final lower = trimmed.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return trimmed;
  }
  final base = apiBaseUrl ?? ApiConstants.apiBaseUrl;
  final origin = _originOf(base);
  if (trimmed.startsWith('/')) return '$origin$trimmed';
  return '$origin/$trimmed';
}

String _originOf(String apiBaseUrl) {
  final uri = Uri.parse(apiBaseUrl);
  final port = uri.hasPort ? ':${uri.port}' : '';
  return '${uri.scheme}://${uri.host}$port';
}

/// Extracts the file id from `/api/v1/files/:fileId` style URLs.
String? fileIdFromDownloadUrl(String downloadUrl) {
  try {
    final uri = Uri.parse(downloadUrl);
    final segs = uri.pathSegments;
    final idx = segs.lastIndexOf('files');
    if (idx >= 0 && idx + 1 < segs.length) return segs[idx + 1];
    return null;
  } catch (_) {
    return null;
  }
}
