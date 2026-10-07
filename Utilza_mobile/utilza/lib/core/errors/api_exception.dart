/// Central API exception. Preserves backend HTTP status + stable `code`.
class ApiException implements Exception {
  const ApiException({
    this.statusCode,
    required this.code,
    required this.message,
    this.details,
  });

  final int? statusCode;
  final String code;
  final String message;
  final dynamic details;

  bool get isUnauthorized =>
      statusCode == 401 || code == 'UNAUTHORIZED';

  bool get isExpiredResult =>
      statusCode == 410 || code == 'FILE_EXPIRED';

  bool get isNotImplemented =>
      statusCode == 501 || code == 'NOT_IMPLEMENTED';

  bool get isNoWorker => code == 'NO_WORKER';

  @override
  String toString() => 'ApiException($statusCode $code): $message';
}
