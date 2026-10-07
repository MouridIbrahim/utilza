import '../utils/json_helpers.dart';

/// Caller-scoped history record, newest first.
/// Backend does NOT auto-create; app POSTs `{toolSlug, inputSummary≤500}`.
class ToolHistory {
  const ToolHistory({
    required this.id,
    required this.toolSlug,
    this.inputSummary,
    this.createdAt,
    this.userId,
  });

  final String id;
  final String toolSlug;
  final String? inputSummary;
  final DateTime? createdAt;
  final String? userId;

  factory ToolHistory.fromJson(Map<String, dynamic> json) {
    return ToolHistory(
      id: stringOf(json, 'id'),
      toolSlug: stringOf(
        json,
        'toolSlug',
        fallback: stringOf(json, 'tool_slug'),
      ),
      inputSummary: nullableStringOf(json, 'inputSummary') ??
          nullableStringOf(json, 'input_summary'),
      createdAt: tryParseDate(json['createdAt']),
      userId: nullableStringOf(json, 'userId'),
    );
  }
}
