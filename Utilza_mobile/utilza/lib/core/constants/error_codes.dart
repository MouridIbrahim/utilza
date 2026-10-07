// Stable backend error codes. Source: UTILZA_FLUTTER_AI_AGENT_SPEC.md §29.
abstract final class ErrorCodes {
  static const validationError = 'VALIDATION_ERROR';
  static const unauthorized = 'UNAUTHORIZED';
  static const forbidden = 'FORBIDDEN';
  static const notFound = 'NOT_FOUND';
  static const toolNotFound = 'TOOL_NOT_FOUND';
  static const categoryNotFound = 'CATEGORY_NOT_FOUND';
  static const fileNotFound = 'FILE_NOT_FOUND';
  static const jobNotFound = 'JOB_NOT_FOUND';
  static const noWorker = 'NO_WORKER';
  static const emailTaken = 'EMAIL_TAKEN';
  static const alreadyFavorited = 'ALREADY_FAVORITED';
  static const fileExpired = 'FILE_EXPIRED';
  static const payloadTooLarge = 'PAYLOAD_TOO_LARGE';
  static const fileTooLarge = 'FILE_TOO_LARGE';
  static const rateLimited = 'RATE_LIMITED';
  static const aiQuotaExceeded = 'AI_QUOTA_EXCEEDED';
  static const internalError = 'INTERNAL_ERROR';
  static const notImplemented = 'NOT_IMPLEMENTED';
  static const aiProviderError = 'AI_PROVIDER_ERROR';
  static const aiNotConfigured = 'AI_NOT_CONFIGURED';
}
