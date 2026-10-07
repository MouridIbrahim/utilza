import 'package:dio/dio.dart';

import '../constants/api_constants.dart';

/// Helpers for multipart uploads and query serialization.
///
/// Contract: transform endpoints use field `files`; only
/// `POST /api/v1/files/process` uses singular `file`.
abstract final class MultipartHelper {
  static FormData buildFormData({
    required List<MultipartFile> files,
    required String fieldName,
    Map<String, dynamic>? fields,
  }) {
    final form = FormData();
    if (fields != null) {
      for (final entry in fields.entries) {
        if (entry.value == null) continue;
        form.fields.add(MapEntry(entry.key, entry.value.toString()));
      }
    }
    for (final file in files) {
      form.files.add(MapEntry(fieldName, file));
    }
    return form;
  }

  static String fieldForValidatorStub() =>
      ApiConstants.multipartFieldSingleFile;

  static String fieldForTools() => ApiConstants.multipartFieldFiles;
}

/// Client-side pre-validation (backend remains authoritative).
/// Returns a user-facing error string, or null when valid.
String? validateFileSelection({
  required int count,
  required List<String> fileNames,
  required List<int> fileSizes,
  required int minFiles,
  required int maxFiles,
  Set<String>? allowedExtensions,
  int? maxSizePerFile,
  int? maxCombinedSize,
}) {
  if (count < minFiles) {
    return minFiles == maxFiles
        ? 'Please select $minFiles file(s).'
        : 'Please select at least $minFiles file(s).';
  }
  if (count > maxFiles) {
    return 'Please select at most $maxFiles file(s).';
  }
  if (allowedExtensions != null && allowedExtensions.isNotEmpty) {
    final allowed = allowedExtensions.map((e) => e.toLowerCase()).toSet();
    for (final name in fileNames) {
      final ext = name.contains('.')
          ? name.split('.').last.toLowerCase()
          : '';
      if (!allowed.contains(ext)) {
        return 'Unsupported file type: $name. '
            'Allowed: ${allowed.join(', ')}.';
      }
    }
  }
  if (maxSizePerFile != null) {
    for (var i = 0; i < fileSizes.length; i++) {
      if (fileSizes[i] > maxSizePerFile) {
        return '${fileNames[i]} is too large. '
            'Maximum is ${_mb(maxSizePerFile)}.';
      }
    }
  }
  if (maxCombinedSize != null) {
    final total = fileSizes.fold<int>(0, (a, b) => a + b);
    if (total > maxCombinedSize) {
      return 'Combined size too large. Maximum is ${_mb(maxCombinedSize)}.';
    }
  }
  return null;
}

String _mb(int bytes) {
  final mb = bytes / (1024 * 1024);
  if (mb >= 1) return '${mb.toStringAsFixed(mb < 10 ? 1 : 0)} MB';
  return '${(bytes / 1024).toStringAsFixed(0)} KB';
}

/// Drops nulls and empty strings so optional query params are omitted
/// instead of sent as `?search=` (spec §11).
Map<String, dynamic> cleanQuery(Map<String, dynamic> query) {
  final out = <String, dynamic>{};
  for (final entry in query.entries) {
    final v = entry.value;
    if (v == null) continue;
    if (v is String && v.isEmpty) continue;
    out[entry.key] = v;
  }
  return out;
}
