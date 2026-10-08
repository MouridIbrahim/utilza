import 'package:dio/dio.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../domain/tool_executor_config.dart';

/// Outcome of one backend execution. Never assumes `FileToolResult`:
/// JSON tools return raw maps, zip-extract returns a file list.
sealed class BackendToolOutcome {
  const BackendToolOutcome();
}

class FileToolOutcome extends BackendToolOutcome {
  const FileToolOutcome(this.result);
  final FileToolResult result;
}

class ZipExtractOutcome extends BackendToolOutcome {
  const ZipExtractOutcome(this.result);
  final ZipExtractResult result;
}

class JsonToolOutcome extends BackendToolOutcome {
  const JsonToolOutcome(this.data);
  final Map<String, dynamic> data;
}

/// Executes a [ToolExecutorConfig] via multipart POST.
/// Single attempt only — no automatic retries of transform uploads.
class BackendToolDataSource {
  BackendToolDataSource(this._client);
  final ApiClient _client;

  Future<BackendToolOutcome> execute({
    required ToolExecutorConfig config,
    required List<MultipartFile> files,
    Map<String, dynamic>? fields,
    void Function(int sent, int total)? onSendProgress,
  }) async {
    final body = <String, dynamic>{};
    if (fields != null) {
      for (final entry in fields.entries) {
        if (entry.value == null) continue;
        if (entry.value is String &&
            (entry.value as String).trim().isEmpty) {
          continue;
        }
        body[entry.key] = entry.value;
      }
    }
    switch (config.resultType) {
      case ToolResultType.file:
        final result = await _client.postMultipart<FileToolResult>(
          config.endpoint,
          files: files,
          fields: body,
          fieldName: config.fileField,
          fromData: (data) => FileToolResult.fromJson(
            data is Map<String, dynamic> ? data : <String, dynamic>{},
          ),
          onSendProgress: onSendProgress,
        );
        return FileToolOutcome(result);
      case ToolResultType.zipExtract:
        final result = await _client.postMultipart<ZipExtractResult>(
          config.endpoint,
          files: files,
          fields: body,
          fieldName: config.fileField,
          fromData: (data) => ZipExtractResult.fromJson(
            data is Map<String, dynamic> ? data : <String, dynamic>{},
          ),
          onSendProgress: onSendProgress,
        );
        return ZipExtractOutcome(result);
      case ToolResultType.json:
        final result = await _client.postMultipart<Map<String, dynamic>>(
          config.endpoint,
          files: files,
          fields: body,
          fieldName: config.fileField,
          fromData: (data) => data is Map<String, dynamic>
              ? data
              : <String, dynamic>{'value': data},
          onSendProgress: onSendProgress,
        );
        return JsonToolOutcome(result);
    }
  }
}
