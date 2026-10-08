import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/errors/api_exception.dart';
import 'package:utilza/core/network/api_client.dart';
import 'package:utilza/core/utils/file_saver.dart';
import 'package:utilza/core/network/downloaded_file.dart';
import 'package:utilza/features/tools/data/backend_tool_datasource.dart';
import 'package:utilza/features/tools/domain/backend_tool_configs.dart';
import 'package:utilza/features/tools/domain/tool_executor_config.dart';

const _fileConfig = ToolExecutorConfig(
  endpoint: '/tools/pdf/merge',
  minFiles: 2,
  maxFiles: 20,
  allowedExtensions: {'pdf'},
  resultType: ToolResultType.file,
);

Dio stubDio({
  required Map<String, dynamic> Function(RequestOptions options) respond,
  void Function(RequestOptions options)? capture,
  int statusCode = 200,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        capture?.call(options);
        handler.resolve(
          Response(
            requestOptions: options,
            statusCode: statusCode,
            data: respond(options),
          ),
        );
      },
    ),
  );
  return dio;
}

MultipartFile pdf(String name) =>
    MultipartFile.fromString('%PDF', filename: name);

void main() {
  group('registry never invents endpoints', () {
    test('unknown slugs resolve to null', () {
      expect(BackendToolConfigs.lookup('no-such-tool'), isNull);
      expect(BackendToolConfigs.lookup(''), isNull);
    });

    test('registered slugs resolve to their exact table endpoint', () {
      expect(
        BackendToolConfigs.lookup('pdf-merge')?.endpoint,
        '/tools/pdf/merge',
      );
    });
  });

  group('config validation', () {
    test('field validators enforce ranges and options', () {
      const angle = ToolField(
        name: 'angle',
        label: 'Angle',
        type: ToolFieldType.integer,
        required: true,
        min: 90,
        max: 270,
      );
      expect(angle.validate(''), isNotNull);
      expect(angle.validate('45'), isNotNull);
      expect(angle.validate('90'), isNull);
      const format = ToolField(
        name: 'format',
        label: 'Format',
        type: ToolFieldType.select,
        options: ['png', 'jpg'],
      );
      expect(format.validate('gif'), isNotNull);
      expect(format.validate('png'), isNull);
      expect(format.validate(''), isNull);
    });

    test('encode omits empty optionals, parses numbers', () {
      const quality = ToolField(
        name: 'quality',
        label: 'Quality',
        type: ToolFieldType.integer,
        defaultValue: '80',
      );
      expect(quality.encode(''), '80');
      expect(quality.encode('90'), 90);
    });

    test('summaries truncate to 500 without raw contents', () {
      const config = ToolExecutorConfig(
        endpoint: '/tools/pdf/merge',
        resultType: ToolResultType.file,
      );
      final long = List.filled(600, 'x').join();
      final summary = config.summarize({}, [long]);
      expect(summary.length, lessThanOrEqualTo(500));
    });
  });

  group('datasource execution', () {
    test('posts multipart with `files` field to the exact endpoint', () async {
      String? path;
      List<String>? fieldNames;
      final ds = BackendToolDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) {
              path = o.path;
              final form = o.data as FormData;
              fieldNames = [for (final f in form.files) f.key];
            },
            respond: (_) => {
              'success': true,
              'data': {
                'jobId': 'j',
                'fileId': 'f',
                'downloadUrl': '/api/v1/files/f',
                'mimeType': 'application/pdf',
                'size': 10,
              }
            },
          ),
        ),
      );
      final outcome = await ds.execute(
        config: _fileConfig,
        files: [pdf('a.pdf'), pdf('b.pdf')],
      );
      expect(path, '/tools/pdf/merge');
      expect(fieldNames, ['files', 'files']);
      expect(outcome, isA<FileToolOutcome>());
    });

    test('validator stub honors singular `file` field', () async {
      List<String>? fieldNames;
      const stub = ToolExecutorConfig(
        endpoint: '/files/process',
        fileField: 'file',
        resultType: ToolResultType.json,
      );
      final ds = BackendToolDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) {
              final form = o.data as FormData;
              fieldNames = [for (final f in form.files) f.key];
            },
            respond: (_) => {
              'success': true,
              'data': {'jobId': 'j'}
            },
          ),
        ),
      );
      await ds.execute(config: stub, files: [pdf('a.pdf')]);
      expect(fieldNames, ['file']);
    });

    test('routes json and zip-extract results without assuming files',
        () async {
      final jsonDs = BackendToolDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {'pageCount': 2, 'pages': [], 'charCount': 0}
            },
          ),
        ),
      );
      const jsonConfig = ToolExecutorConfig(
        endpoint: '/tools/pdf/text',
        resultType: ToolResultType.json,
      );
      final jsonOut = await jsonDs.execute(
        config: jsonConfig,
        files: [pdf('a.pdf')],
      );
      expect((jsonOut as JsonToolOutcome).data['pageCount'], 2);

      final zipDs = BackendToolDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {
                'count': 1,
                'files': [
                  {
                    'fileId': 'f',
                    'downloadUrl': '/api/v1/files/f',
                    'name': 'a.txt',
                    'size': 1,
                    'mimeType': 'text/plain',
                  }
                ],
              }
            },
          ),
        ),
      );
      const zipConfig = ToolExecutorConfig(
        endpoint: '/tools/file/zip-extract',
        resultType: ToolResultType.zipExtract,
      );
      final zipOut = await zipDs.execute(
        config: zipConfig,
        files: [pdf('a.zip')],
      );
      expect((zipOut as ZipExtractOutcome).result.count, 1);
    });

    test('single attempt on failure (no auto-retry)', () async {
      var calls = 0;
      final dio = Dio(BaseOptions(baseUrl: 'https://x'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, h) {
            calls++;
            h.reject(
              DioException(
                requestOptions: o,
                type: DioExceptionType.badResponse,
                response: Response(
                  requestOptions: o,
                  statusCode: 410,
                  data: {
                    'success': false,
                    'error': {'code': 'FILE_EXPIRED', 'message': 'gone'}
                  },
                ),
              ),
            );
          },
        ),
      );
      final ds = BackendToolDataSource(ApiClient(dio: dio));
      try {
        await ds.execute(config: _fileConfig, files: [pdf('a.pdf')]);
        fail('expected ApiException');
      } on ApiException catch (e) {
        expect(e.code, 'FILE_EXPIRED');
        expect(e.statusCode, 410);
      }
      expect(calls, 1);
    });
  });

  group('file saver', () {
    test('sanitizes names and saves bytes to temp', () async {
      final previous = FileSaver.directoryProvider;
      FileSaver.directoryProvider = () async => Directory.systemTemp;
      addTearDown(() => FileSaver.directoryProvider = previous);

      expect(FileSaver.sanitize('../../evil?.pdf'), isNot(contains('/')));
      final file = await FileSaver.save(
        DownloadedFile(
          bytes: Uint8List.fromList([1, 2, 3]),
          contentType: 'application/pdf',
          fileName: 'out.pdf',
        ),
        suggestedName: 'out.pdf',
      );
      expect(await file.exists(), isTrue);
      expect(await file.length(), 3);
      await file.delete();
    });
  });
}
