import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../constants/api_constants.dart';
import '../errors/api_exception.dart';
import '../errors/error_mapper.dart';
import 'api_envelope.dart';
import 'auth_interceptor.dart';
import 'downloaded_file.dart';
import 'multipart_helper.dart';

/// Centralized HTTP client for `utilza_backend`.
///
/// - JSON: `Accept/Content-Type: application/json`
/// - Multipart: never set Content-Type manually (Dio sets the boundary)
/// - Auth: Bearer injection + 401 clearing via [AuthInterceptor]
/// - Downloads (`GET /files/:id`): raw bytes, unauthenticated by default
/// - No automatic retries for login/register/uploads/transforms.
class ApiClient {
  ApiClient({
    Dio? dio,
    String? baseUrl,
    Future<String?> Function()? getToken,
    Future<void> Function()? onUnauthorized,
  }) : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: baseUrl ?? ApiConstants.apiBaseUrl,
                connectTimeout: ApiConstants.connectTimeout,
                receiveTimeout: ApiConstants.receiveTimeout,
                sendTimeout: ApiConstants.sendTimeout,
                headers: const {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
              ),
            ) {
    if (getToken != null && onUnauthorized != null) {
      _dio.interceptors.add(
        AuthInterceptor(
          getToken: getToken,
          onUnauthorized: onUnauthorized,
        ),
      );
    }
  }

  final Dio _dio;

  Dio get dio => _dio;

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? query,
    required T Function(Object? data) fromData,
    bool auth = true,
  }) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: query == null ? null : cleanQuery(query),
        options: Options(extra: {AuthInterceptor.authExtraKey: auth}),
      );
      // ignore: unawaited_return_in_try_block
      return _unwrap(res.statusCode, res.data, fromData);
    } on DioException catch (e) {
      throw ErrorMapper.fromDio(e);
    }
  }

  Future<T> post<T>(
    String path, {
    Map<String, dynamic>? body,
    Map<String, dynamic>? query,
    required T Function(Object? data) fromData,
    bool auth = true,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        path,
        data: body,
        queryParameters: query == null ? null : cleanQuery(query),
        options: Options(extra: {AuthInterceptor.authExtraKey: auth}),
      );
      // ignore: unawaited_return_in_try_block
      return _unwrap(res.statusCode, res.data, fromData);
    } on DioException catch (e) {
      throw ErrorMapper.fromDio(e);
    }
  }

  Future<T> patch<T>(
    String path, {
    Map<String, dynamic>? body,
    required T Function(Object? data) fromData,
    bool auth = true,
  }) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(
        path,
        data: body,
        options: Options(extra: {AuthInterceptor.authExtraKey: auth}),
      );
      // ignore: unawaited_return_in_try_block
      return _unwrap(res.statusCode, res.data, fromData);
    } on DioException catch (e) {
      throw ErrorMapper.fromDio(e);
    }
  }

  Future<T> delete<T>(
    String path, {
    required T Function(Object? data) fromData,
    bool auth = true,
  }) async {
    try {
      final res = await _dio.delete<Map<String, dynamic>>(
        path,
        options: Options(extra: {AuthInterceptor.authExtraKey: auth}),
      );
      // ignore: unawaited_return_in_try_block
      return _unwrap(res.statusCode, res.data, fromData);
    } on DioException catch (e) {
      throw ErrorMapper.fromDio(e);
    }
  }

  /// Multipart transform POST. [files] are already-opened [MultipartFile]s.
  /// [fieldName] defaults to `files`; validator stub uses `file`.
  Future<T> postMultipart<T>(
    String path, {
    required List<MultipartFile> files,
    Map<String, dynamic>? fields,
    String fieldName = ApiConstants.multipartFieldFiles,
    required T Function(Object? data) fromData,
    bool auth = true,
    void Function(int sent, int total)? onSendProgress,
  }) async {
    try {
      final form = MultipartHelper.buildFormData(
        files: files,
        fieldName: fieldName,
        fields: fields,
      );
      final res = await _dio.post<Map<String, dynamic>>(
        path,
        data: form,
        // Do NOT set Content-Type: Dio generates the boundary.
        options: Options(extra: {AuthInterceptor.authExtraKey: auth}),
        onSendProgress: onSendProgress,
      );
      // ignore: unawaited_return_in_try_block
      return _unwrap(res.statusCode, res.data, fromData);
    } on DioException catch (e) {
      throw ErrorMapper.fromDio(e);
    }
  }

  /// Raw-bytes download. Unauthenticated by default per backend contract.
  Future<DownloadedFile> downloadBytes(
    String pathOrUrl, {
    bool auth = false,
  }) async {
    try {
      final res = await _dio.get<List<int>>(
        pathOrUrl,
        options: Options(
          responseType: ResponseType.bytes,
          extra: {AuthInterceptor.authExtraKey: auth},
        ),
      );
      final data = res.data ?? <int>[];
      final headers = res.headers;
      return DownloadedFile(
        bytes: Uint8List.fromList(data),
        contentType: headers.value('content-type'),
        fileName: filenameFromContentDisposition(
          headers.value('content-disposition'),
        ),
      );
    } on DioException catch (e) {
      throw ErrorMapper.fromDownloadError(e);
    }
  }

  T _unwrap<T>(
    int? statusCode,
    Map<String, dynamic>? json,
    T Function(Object? data) fromData,
  ) {
    if (json == null) {
      throw ApiException(
        statusCode: statusCode,
        code: 'INTERNAL_ERROR',
        message: 'Empty response from server.',
      );
    }
    if (json['success'] == true) {
      return fromData(json['data']);
    }
    final err = ApiErrorResponse.fromJson(json);
    throw ApiException(
      statusCode: statusCode,
      code: err.error.code,
      message: err.error.message,
      details: err.error.details,
    );
  }
}
