import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/errors/api_exception.dart';
import 'package:utilza/core/network/api_client.dart';
import 'package:utilza/core/network/auth_interceptor.dart';
import 'package:utilza/core/network/downloaded_file.dart';

/// Fake HTTP adapter returning a canned status + JSON body through the real
/// Dio pipeline (so validateStatus + onError interceptors run).
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter({required this.statusCode, required this.jsonBody});
  final int statusCode;
  final Map<String, dynamic> jsonBody;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      json.encode(jsonBody),
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Dio stubDio({
  required Future<void> Function(RequestOptions options)? onRequestCapture,
  Object? Function(RequestOptions options)? stubData,
  int statusCode = 200,
  Headers? headers,
  Future<String?> Function()? getToken,
  Future<void> Function()? onUnauthorized,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
  if (getToken != null && onUnauthorized != null) {
    dio.interceptors.add(
      AuthInterceptor(getToken: getToken, onUnauthorized: onUnauthorized),
    );
  }
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        await onRequestCapture?.call(options);
        final data = stubData?.call(options);
        handler.resolve(
          Response(
            requestOptions: options,
            statusCode: statusCode,
            data: data,
            headers: headers,
          ),
        );
      },
    ),
  );
  return dio;
}

void main() {
  group('Bearer header', () {
    test('attaches Authorization when token exists', () async {
      String? captured;
      final dio = stubDio(
        getToken: () async => 'jwt-123',
        onUnauthorized: () async {},
        onRequestCapture: (o) async {
          captured = o.headers['Authorization']?.toString();
        },
        stubData: (_) => {'success': true, 'data': {'ok': true}},
      );
      final client = ApiClient(dio: dio);
      await client.get<Map>(
        '/tools',
        fromData: (d) => d as Map,
      );
      expect(captured, 'Bearer jwt-123');
    });

    test('omits Authorization when no token', () async {
      String? captured = 'unset';
      final dio = stubDio(
        getToken: () async => null,
        onUnauthorized: () async {},
        onRequestCapture: (o) async {
          captured = o.headers['Authorization']?.toString();
        },
        stubData: (_) => {'success': true, 'data': {'ok': true}},
      );
      final client = ApiClient(dio: dio);
      await client.get<Map>('/tools', fromData: (d) => d as Map);
      expect(captured, isNull);
    });

    test('does not attach auth to downloads by default', () async {
      String? captured = 'unset';
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.interceptors.add(
        AuthInterceptor(
          getToken: () async => 'jwt-123',
          onUnauthorized: () async {},
        ),
      );
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, h) async {
            captured = o.headers['Authorization']?.toString();
            h.resolve(
              Response(
                requestOptions: o,
                statusCode: 200,
                data: <int>[1, 2, 3],
                headers: Headers.fromMap({'content-type': ['application/pdf']}),
              ),
            );
          },
        ),
      );
      final client = ApiClient(dio: dio);
      await client.downloadBytes('/api/v1/files/abc');
      expect(captured, isNull);
    });
  });

  group('401 behavior', () {
    test('onUnauthorized invoked once, ApiException preserves 401', () async {
      var calls = 0;
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
      dio.httpClientAdapter = FakeAdapter(
        statusCode: 401,
        jsonBody: {
          'success': false,
          'error': {'code': 'UNAUTHORIZED', 'message': 'expired'}
        },
      );
      final client = ApiClient(
        dio: dio,
        getToken: () async => 'expired',
        onUnauthorized: () async => calls++,
      );
      try {
        await client.get<Map>('/auth/me', fromData: (d) => d as Map);
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(e.statusCode, 401);
        expect(e.code, 'UNAUTHORIZED');
      }
      expect(calls, 1);
    });
  });

  group('query serialization + download', () {
    test('omits empty optionals instead of sending empty strings', () async {
      Map<String, dynamic>? seen;
      final dio = stubDio(
        onRequestCapture: (o) async => seen = Map.of(o.queryParameters),
        stubData: (_) => {
          'success': true,
          'data': {'items': [], 'page': 1, 'limit': 20, 'total': 0}
        },
      );
      final client = ApiClient(dio: dio);
      await client.get<Map>(
        '/tools',
        query: {'category': 'pdf', 'search': '', 'page': 1, 'limit': 20},
        fromData: (d) => d as Map,
      );
      expect(seen, {'category': 'pdf', 'page': 1, 'limit': 20});
    });

    test('downloadBytes returns bytes + content-type + filename', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, h) => h.resolve(
            Response(
              requestOptions: o,
              statusCode: 200,
              data: <int>[1, 2, 3, 4],
              headers: Headers.fromMap({
                'content-type': ['application/pdf'],
                'content-disposition': ['attachment; filename="out.pdf"'],
              }),
            ),
          ),
        ),
      );
      final client = ApiClient(dio: dio);
      final file = await client.downloadBytes('/api/v1/files/abc');
      expect(file.size, 4);
      expect(file.contentType, 'application/pdf');
      expect(file.fileName, 'out.pdf');
    });

    test('filenameFromContentDisposition parses variants', () {
      expect(
        filenameFromContentDisposition('attachment; filename="a.zip"'),
        'a.zip',
      );
      expect(filenameFromContentDisposition(null), isNull);
    });
  });
}
