/// Declarative contract for one backend transform endpoint.
/// The endpoint is always an exact known route — never derived from a
/// tool slug. Phase 9 maps every tool to one of these configs.
enum ToolResultType {
  /// Standard `{jobId,fileId,downloadUrl,...}` → download flow.
  file,
  /// ZIP-extract `{count,files[]}` → per-file downloads.
  zipExtract,
  /// Structured JSON (pdf/text, metadata, hash, url/*, …).
  json,
}

enum ToolFieldType { text, number, integer, select, toggle }

class ToolField {
  const ToolField({
    required this.name,
    required this.label,
    this.type = ToolFieldType.text,
    this.required = false,
    this.defaultValue,
    this.options = const [],
    this.min,
    this.max,
    this.minLength,
    this.maxLength,
    this.hint,
  });

  final String name;
  final String label;
  final ToolFieldType type;
  final bool required;
  final String? defaultValue;
  final List<String> options;
  final num? min;
  final num? max;
  final int? minLength;
  final int? maxLength;
  final String? hint;

  /// Client UX validation. Backend remains authoritative.
  String? validate(String? value) {
    final v = (value ?? '').trim();
    if (required && v.isEmpty) return '$label is required.';
    if (v.isEmpty) return null;
    if (minLength != null && v.length < minLength!) {
      return '$label must be at least $minLength characters.';
    }
    if (maxLength != null && v.length > maxLength!) {
      return '$label must be at most $maxLength characters.';
    }
    switch (type) {
      case ToolFieldType.integer:
        final n = int.tryParse(v);
        if (n == null) return '$label must be a whole number.';
        if (min != null && n < min!) return '$label must be ≥ $min.';
        if (max != null && n > max!) return '$label must be ≤ $max.';
        return null;
      case ToolFieldType.number:
        final n = num.tryParse(v);
        if (n == null) return '$label must be a number.';
        if (min != null && n < min!) return '$label must be ≥ $min.';
        if (max != null && n > max!) return '$label must be ≤ $max.';
        return null;
      case ToolFieldType.select:
        if (options.isNotEmpty && !options.contains(v)) {
          return 'Invalid $label.';
        }
        return null;
      case ToolFieldType.text:
      case ToolFieldType.toggle:
        return null;
    }
  }

  /// Serializes for multipart fields; omits empty optionals.
  Object? encode(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return defaultValue;
    switch (type) {
      case ToolFieldType.integer:
        return int.tryParse(v) ?? v;
      case ToolFieldType.number:
        return num.tryParse(v) ?? v;
      case ToolFieldType.toggle:
        return v.toLowerCase() == 'true';
      case ToolFieldType.text:
      case ToolFieldType.select:
        return v;
    }
  }
}

class ToolExecutorConfig {
  const ToolExecutorConfig({
    required this.endpoint,
    this.fileField = 'files',
    this.minFiles = 1,
    this.maxFiles = 1,
    this.allowedExtensions = const {},
    this.maxSizePerFile,
    this.maxCombinedSize,
    this.fields = const [],
    required this.resultType,
    this.notice,
    this.extraValidate,
    this.historySummary,
  });

  /// Exact backend path, e.g. `/tools/pdf/merge`.
  final String endpoint;

  /// Multipart field name: `files` for transforms, `file` only for the
  /// generic `/files/process` validation stub.
  final String fileField;
  final int minFiles;
  final int maxFiles;
  final Set<String> allowedExtensions;
  final int? maxSizePerFile;
  final int? maxCombinedSize;
  final List<ToolField> fields;
  final ToolResultType resultType;

  /// Important disclaimer shown above the form (e.g. redact is visual
  /// cover only, sign is not cryptographic).
  final String? notice;

  /// Cross-field validation on encoded values. Returns an error string
  /// or null when valid (e.g. header/footer requires at least one,
  /// montage files must equal cols × rows).
  final String? Function(Map<String, dynamic> values, int fileCount)?
      extraValidate;

  /// Builds the short history `inputSummary` (≤500 chars, no raw data).
  final String Function(Map<String, dynamic> fields, List<String> fileNames)?
      historySummary;

  String summarize(Map<String, dynamic> fields, List<String> fileNames) {
    final custom = historySummary?.call(fields, fileNames);
    if (custom != null && custom.isNotEmpty) {
      return custom.length > 500 ? custom.substring(0, 500) : custom;
    }
    final names = fileNames.length <= 3
        ? fileNames.join(', ')
        : '${fileNames.length} files';
    final summary = names.isEmpty ? endpoint : '$endpoint: $names';
    return summary.length > 500 ? summary.substring(0, 500) : summary;
  }
}
