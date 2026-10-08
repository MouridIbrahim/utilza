import 'dart:convert';

import 'package:dio/dio.dart';

import '../constants/error_codes.dart';
import 'api_exception.dart';

/// Maps Dio/backend failures to [ApiException].
/// Backend envelope: `{success:false, error:{code,message,details?}}`.
/// Never throws raw stack traces to UI; use [userMessage] for display.
abstract final class ErrorMapper {
  static ApiException fromResponse(int? statusCode, dynamic data) {
    if (data is Map<String, dynamic>) {
      final error = data['error'];
      if (error is Map<String, dynamic>) {
        final code = error['code']?.toString() ?? _codeFor(statusCode);
        final message =
            error['message']?.toString() ?? 'Something went wrong.';
        return ApiException(
          statusCode: statusCode,
          code: code,
          message: message,
          details: error['details'],
        );
      }
    }
    final code = _codeFor(statusCode);
    return ApiException(
      statusCode: statusCode,
      code: code,
      message: _defaultMessage(statusCode, data),
    );
  }

  static ApiException fromDio(DioException e) {
    final response = e.response;
    if (response != null) {
      return fromResponse(response.statusCode, response.data);
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return const ApiException(
          code: 'TIMEOUT',
          message: 'Request timed out. Please try again.',
        );
      case DioExceptionType.cancel:
        return const ApiException(
          code: 'CANCELLED',
          message: 'Request was cancelled.',
        );
      case DioExceptionType.connectionError:
        return const ApiException(
          code: 'NETWORK_ERROR',
          message: 'No internet connection. Please check and retry.',
        );
      case DioExceptionType.badCertificate:
        return const ApiException(
          code: 'NETWORK_ERROR',
          message: 'Secure connection failed.',
        );
      case DioExceptionType.badResponse:
      case DioExceptionType.unknown:
        final msg = e.message ?? 'Something went wrong.';
        return ApiException(code: 'NETWORK_ERROR', message: msg);
    }
  }

  /// Download errors arrive as raw bytes (ResponseType.bytes), so a
  /// JSON error envelope must be decoded before falling back to
  /// status-based codes. Preserves 410 FILE_EXPIRED / 404 codes.
  static ApiException fromDownloadError(DioException e) {
    final response = e.response;
    final data = response?.data;
    if (response != null && data is List<int>) {
      try {
        final decoded = jsonDecode(utf8.decode(data));
        if (decoded is Map<String, dynamic>) {
          return fromResponse(response.statusCode, decoded);
        }
      } catch (_) {
        // Fall through to status-based mapping below.
      }
    }
    return fromDio(e);
  }

  static String _codeFor(int? status) {
    switch (status) {
      case 400:
        return ErrorCodes.validationError;
      case 401:
        return ErrorCodes.unauthorized;
      case 403:
        return ErrorCodes.forbidden;
      case 404:
        return ErrorCodes.notFound;
      case 409:
        return 'CONFLICT';
      case 410:
        return ErrorCodes.fileExpired;
      case 413:
        return ErrorCodes.fileTooLarge;
      case 429:
        return ErrorCodes.rateLimited;
      case 500:
        return ErrorCodes.internalError;
      case 501:
        return ErrorCodes.notImplemented;
      case 502:
        return ErrorCodes.aiProviderError;
      case 503:
        return ErrorCodes.aiNotConfigured;
      default:
        return ErrorCodes.internalError;
    }
  }

  static String _defaultMessage(int? status, dynamic data) {
    if (data is String && data.isNotEmpty) return data;
    switch (status) {
      case 400:
        return 'Please check your input and try again.';
      case 401:
        return 'Session expired. Please log in again.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'Not found.';
      case 409:
        return 'Already exists.';
      case 410:
        return 'This result has expired. Please run the tool again.';
      case 413:
        return 'File too large. Please choose a smaller file.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 501:
        return 'Feature unavailable.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  /// Display-safe message for any failure. Raw exception strings
  /// (e.g. `ApiException(...)`) must never reach the UI.
  static String displayMessage(Object e) {
    if (e is ApiException) return userMessage(e);
    return 'Something went wrong. Please try again.';
  }

  /// User-facing message. Never leaks stack traces / JWTs.
  static String userMessage(ApiException e) {    switch (e.code) {
      case ErrorCodes.validationError:
        return e.message;
      case ErrorCodes.unauthorized:
        return 'Session expired. Please log in again.';
      case ErrorCodes.forbidden:
        return 'Access denied.';
      case ErrorCodes.toolNotFound:
        return 'This tool is unavailable.';
      case ErrorCodes.categoryNotFound:
        return 'Category unavailable.';
      case ErrorCodes.fileNotFound:
        return 'Result unavailable.';
      case ErrorCodes.jobNotFound:
        return 'Job unavailable.';
      case ErrorCodes.noWorker:
        return 'Feature unavailable.';
      case ErrorCodes.emailTaken:
        return 'This email is already registered.';
      case ErrorCodes.alreadyFavorited:
        return 'Already in favorites.';
      case ErrorCodes.fileExpired:
        return 'This result has expired. Please run the tool again.';
      case ErrorCodes.payloadTooLarge:
      case ErrorCodes.fileTooLarge:
        return 'File too large. Please choose a smaller file.';
      case ErrorCodes.rateLimited:
        return 'Too many requests. Please wait and try again.';
      case ErrorCodes.aiQuotaExceeded:
        return 'Quota exceeded. Please try again later.';
      case ErrorCodes.notImplemented:
        return 'Feature unavailable.';
      case ErrorCodes.aiProviderError:
        return 'Processing failed. Please try again.';
      case ErrorCodes.aiNotConfigured:
        return 'Feature unavailable.';
      case ErrorCodes.internalError:
        return e.message.isNotEmpty
            ? e.message
            : 'Server error. Please try again.';
      default:
        return e.message.isNotEmpty
            ? e.message
            : 'Something went wrong. Please try again.';
    }
  }
}
