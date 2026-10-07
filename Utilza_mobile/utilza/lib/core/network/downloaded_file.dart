import 'dart:typed_data';

/// Raw-bytes result of GET /api/v1/files/:fileId.
/// Response is bytes, never a `{success:true}` envelope.
class DownloadedFile {
  const DownloadedFile({
    required this.bytes,
    this.contentType,
    this.fileName,
  });

  final Uint8List bytes;
  final String? contentType;
  final String? fileName;

  int get size => bytes.lengthInBytes;
}

/// Extracts `filename=` from a Content-Disposition header.
String? filenameFromContentDisposition(String? header) {
  if (header == null || header.isEmpty) return null;
  final match = RegExp(r'filename\*?=(?:UTF-8..)?"?([^";]+)"?')
      .firstMatch(header);
  if (match == null) return null;
  return Uri.decodeComponent(match.group(1)!.trim());
}
