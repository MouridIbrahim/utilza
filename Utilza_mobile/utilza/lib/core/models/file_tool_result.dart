import '../utils/json_helpers.dart';
import '../utils/url_resolver.dart';

/// Standard synchronous transform result. Not a background job despite
/// `jobId`. `downloadUrl` may be relative → resolve against origin.
/// URLs expire after ~1h; download promptly.
class FileToolResult {
  const FileToolResult({
    required this.jobId,
    required this.fileId,
    required this.downloadUrl,
    this.mimeType,
    this.size,
    this.expiresAt,
  });

  final String jobId;
  final String fileId;
  final String downloadUrl;
  final String? mimeType;
  final int? size;
  final DateTime? expiresAt;

  String resolvedUrl({String? apiBaseUrl}) =>
      resolveDownloadUrl(downloadUrl, apiBaseUrl: apiBaseUrl);

  factory FileToolResult.fromJson(Map<String, dynamic> json) {
    return FileToolResult(
      jobId: stringOf(json, 'jobId'),
      fileId: stringOf(json, 'fileId'),
      downloadUrl: stringOf(json, 'downloadUrl'),
      mimeType: nullableStringOf(json, 'mimeType'),
      size: nullableIntOf(json, 'size'),
      expiresAt: tryParseDate(json['expiresAt']),
    );
  }
}

/// ZIP-extract JSON result: `{count, files[]}` (not a single download).
class ZipExtractResult {
  const ZipExtractResult({required this.count, required this.files});

  final int count;
  final List<ZipExtractFile> files;

  factory ZipExtractResult.fromJson(Map<String, dynamic> json) {
    return ZipExtractResult(
      count: intOf(json, 'count'),
      files: listOf(
        json['files'],
        (e) => ZipExtractFile.fromJson(e as Map<String, dynamic>),
      ),
    );
  }
}

class ZipExtractFile {
  const ZipExtractFile({
    required this.fileId,
    required this.downloadUrl,
    required this.name,
    this.size,
    this.mimeType,
  });

  final String fileId;
  final String downloadUrl;
  final String name;
  final int? size;
  final String? mimeType;

  factory ZipExtractFile.fromJson(Map<String, dynamic> json) {
    return ZipExtractFile(
      fileId: stringOf(json, 'fileId'),
      downloadUrl: stringOf(json, 'downloadUrl'),
      name: stringOf(json, 'name'),
      size: nullableIntOf(json, 'size'),
      mimeType: nullableStringOf(json, 'mimeType'),
    );
  }
}
