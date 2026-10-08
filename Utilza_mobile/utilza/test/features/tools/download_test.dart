import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/errors/api_exception.dart';
import 'package:utilza/core/errors/error_mapper.dart';
import 'package:utilza/core/network/api_client.dart';
import 'package:utilza/core/network/downloaded_file.dart';
import 'package:utilza/core/utils/file_saver.dart';

/// Counting byte adapter exercising the real Dio pipeline
/// (validateStatus + interceptors), like production downloads.
class _BytesAdapter implements HttpClientAdapter {
  _BytesAdapter({required this.statusCode, required this.body});
  final int statusCode;
  final List<int> body;
  int fetches = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    fetches++;
    return ResponseBody.fromBytes(
      body,
      statusCode,
      headers: {
        Headers.contentTypeHeader: ['application/pdf'],
        'content-disposition': ['attachment; filename="out.pdf"'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  group('generated-file downloads', () {
    test('bytes saved on every action, never the URL as artifact', () async {
      final adapter = _BytesAdapter(
        statusCode: 200,
        body: [1, 2, 3, 4],
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = adapter;
      final client = ApiClient(dio: dio);

      // Each user action re-downloads fresh (URLs expire ~1h).
      final first = await client.downloadBytes('/api/v1/files/abc');
      final second = await client.downloadBytes('/api/v1/files/abc');
      expect(first.size, 4);
      expect(second.size, 4);
      expect(adapter.fetches, 2);
      expect(first.fileName, 'out.pdf');
      expect(first.contentType, 'application/pdf');
    });

    test('410 maps to FILE_EXPIRED with run-again message', () async {
      final adapter = _BytesAdapter(
        statusCode: 410,
        body: utf8.encode(jsonEncode({
          'success': false,
          'error': {'code': 'FILE_EXPIRED', 'message': 'expired'}
        })),
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = adapter;
      final client = ApiClient(dio: dio);
      try {
        await client.downloadBytes('/api/v1/files/stale');
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(e.code, 'FILE_EXPIRED');
        expect(
          ErrorMapper.userMessage(e),
          contains('run the tool again'),
        );
      }
      // Single attempt per tap — no tight retry loop.
      expect(adapter.fetches, 1);
    });

    test('non-JSON error bytes fall back to status codes', () async {
      final adapter = _BytesAdapter(
        statusCode: 410,
        body: [0, 1, 2, 3],
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = adapter;
      final client = ApiClient(dio: dio);
      try {
        await client.downloadBytes('/api/v1/files/stale');
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(e.code, 'FILE_EXPIRED');
        expect(
          ErrorMapper.userMessage(e),
          contains('run the tool again'),
        );
      }
    });

    test('missing result maps to not-found', () async {
      final adapter = _BytesAdapter(
        statusCode: 404,
        body: utf8.encode(jsonEncode({
          'success': false,
          'error': {'code': 'FILE_NOT_FOUND', 'message': 'gone'}
        })),
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://example.com'));
      dio.httpClientAdapter = adapter;
      final client = ApiClient(dio: dio);
      try {
        await client.downloadBytes('/api/v1/files/gone');
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(e.code, 'FILE_NOT_FOUND');
      }
      expect(adapter.fetches, 1);
    });
  });

  group('temp file handling', () {
    test('collision produces a distinct path', () async {
      final previous = FileSaver.directoryProvider;
      FileSaver.directoryProvider = () async => Directory.systemTemp;
      addTearDown(() => FileSaver.directoryProvider = previous);

      File mk(String name) => File('${Directory.systemTemp.path}/$name');
      final existing = mk('collision.pdf');
      await existing.writeAsBytes([9]);
      addTearDown(() async {
        if (await existing.exists()) await existing.delete();
      });

      final saved = await FileSaver.save(
        DownloadedFile(
          bytes: Uint8List.fromList([1]),
          fileName: 'collision.pdf',
        ),
        suggestedName: 'collision.pdf',
      );
      addTearDown(() async {
        if (await saved.exists()) await saved.delete();
      });
      expect(saved.path, isNot(existing.path));
      expect(await saved.exists(), isTrue);
    });
  });
}
