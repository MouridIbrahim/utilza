import '../utils/json_helpers.dart';

/// Job scaffold model. No workers are registered; creation returns
/// 404 NO_WORKER. Do not surface as a user-facing jobs system.
class Job {
  const Job({
    required this.id,
    this.type,
    this.status,
    this.createdAt,
    this.updatedAt,
    this.result,
    this.error,
  });

  final String id;
  final String? type;
  final String? status;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final Map<String, dynamic>? result;
  final Map<String, dynamic>? error;

  factory Job.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? mapOf(dynamic v) {
      if (v is Map<String, dynamic>) return v;
      return null;
    }

    return Job(
      id: stringOf(json, 'id'),
      type: nullableStringOf(json, 'type'),
      status: nullableStringOf(json, 'status'),
      createdAt: tryParseDate(json['createdAt']),
      updatedAt: tryParseDate(json['updatedAt']),
      result: mapOf(json['result']),
      error: mapOf(json['error']),
    );
  }
}
