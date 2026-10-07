/// Backend JSON envelope. All normal JSON responses use
/// `{success:true, data:...}` / `{success:false, error:{code,message,details?}}`.
class ApiSuccess<T> {
  const ApiSuccess({required this.data});
  final T data;

  static ApiSuccess<T> parse<T>(
    Map<String, dynamic> json,
    T Function(Object? data) fromData,
  ) {
    return ApiSuccess<T>(data: fromData(json['data']));
  }
}

class ApiErrorBody {
  const ApiErrorBody({
    required this.code,
    required this.message,
    this.details,
  });

  final String code;
  final String message;
  final dynamic details;

  factory ApiErrorBody.fromJson(Map<String, dynamic> json) {
    return ApiErrorBody(
      code: json['code']?.toString() ?? 'INTERNAL_ERROR',
      message: json['message']?.toString() ?? 'Something went wrong.',
      details: json['details'],
    );
  }
}

class ApiErrorResponse {
  const ApiErrorResponse({required this.error});
  final ApiErrorBody error;

  factory ApiErrorResponse.fromJson(Map<String, dynamic> json) {
    final error = json['error'];
    if (error is Map<String, dynamic>) {
      return ApiErrorResponse(error: ApiErrorBody.fromJson(error));
    }
    return const ApiErrorResponse(
      error: ApiErrorBody(code: 'INTERNAL_ERROR', message: 'Unknown error'),
    );
  }
}

/// Unwraps `{success:true, data}` or throws parsed [ApiErrorResponse].
/// Raw-bytes downloads (GET /files/:id) never go through here.
Object? unwrapEnvelope(Map<String, dynamic> json) {
  final success = json['success'];
  if (success == true) return json['data'];
  final err = ApiErrorResponse.fromJson(json);
  throw err;
}
