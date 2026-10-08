import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/network/api_client.dart';
import 'package:utilza/features/tools/data/backend_tool_datasource.dart';
import 'package:utilza/features/tools/data/url_tool_datasource.dart';
import 'package:utilza/features/tools/domain/backend_tool_configs.dart';

Dio stubDio({
  required Map<String, dynamic> Function(RequestOptions options) respond,
  void Function(RequestOptions options)? capture,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        capture?.call(options);
        handler.resolve(
          Response(
            requestOptions: options,
            statusCode: 200,
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

Map<String, dynamic> fileData(String mime) => {
      'success': true,
      'data': {
        'jobId': 'j',
        'fileId': 'f',
        'downloadUrl': '/api/v1/files/f',
        'mimeType': mime,
        'size': 10,
      },
    };

/// One representative execution per backend family through the exact
/// registered endpoint, asserting JSON-vs-file result routing.
void main() {
  group('representative family executions', () {
    test('PDF merge posts files and returns a file result', () async {
      String? path;
      final ds = BackendToolDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => path = o.path,
            respond: (_) => fileData('application/pdf'),
          ),
        ),
      );
      final config = BackendToolConfigs.lookup('pdf-merge')!;
      final outcome = await ds.execute(
        config: config,
        files: [pdf('a.pdf'), pdf('b.pdf')],
      );
      expect(path, '/tools/pdf/merge');
      expect(outcome, isA<FileToolOutcome>());
      expect(
        (outcome as FileToolOutcome).result.mimeType,
        'application/pdf',
      );
    });

    test('image compress sends quality and returns a file result', () async {
      Map<String, String>? fields;
      final ds = BackendToolDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) {
              final form = o.data as FormData;
              fields = {for (final f in form.fields) f.key: f.value};
            },
            respond: (_) => fileData('image/jpeg'),
          ),
        ),
      );
      final config = BackendToolConfigs.lookup('image-compress')!;
      final outcome = await ds.execute(
        config: config,
        files: [MultipartFile.fromString('img', filename: 'a.jpg')],
        fields: {'quality': 80},
      );
      expect(fields?['quality'], '80');
      expect(outcome, isA<FileToolOutcome>());
    });

    test('document to-pdf returns a file result', () async {
      String? path;
      final ds = BackendToolDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => path = o.path,
            respond: (_) => fileData(
              'application/vnd.openxmlformats-officedocument.'
              'wordprocessingml.document',
            ),
          ),
        ),
      );
      final outcome = await ds.execute(
        config: BackendToolConfigs.lookup('document-to-pdf')!,
        files: [MultipartFile.fromString('doc', filename: 'a.docx')],
      );
      expect(path, '/tools/document/to-pdf');
      expect(outcome, isA<FileToolOutcome>());
    });

    test('file hash returns JSON, never a download', () async {
      final ds = BackendToolDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {'sha256': 'a', 'sha512': 'b', 'size': 3},
            },
          ),
        ),
      );
      final outcome = await ds.execute(
        config: BackendToolConfigs.lookup('file-hash')!,
        files: [pdf('a.pdf')],
      );
      expect(outcome, isA<JsonToolOutcome>());
      expect((outcome as JsonToolOutcome).data['sha256'], 'a');
    });

    test('file zip-extract returns a multi-file listing', () async {
      final ds = BackendToolDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {
                'count': 2,
                'files': [
                  {
                    'fileId': 'f1',
                    'downloadUrl': '/api/v1/files/f1',
                    'name': 'a.txt',
                    'size': 1,
                    'mimeType': 'text/plain',
                  },
                  {
                    'fileId': 'f2',
                    'downloadUrl': '/api/v1/files/f2',
                    'name': 'b.txt',
                    'size': 2,
                    'mimeType': 'text/plain',
                  },
                ],
              }
            },
          ),
        ),
      );
      final outcome = await ds.execute(
        config: BackendToolConfigs.lookup('file-zip-extract')!,
        files: [MultipartFile.fromString('zip', filename: 'a.zip')],
      );
      expect(outcome, isA<ZipExtractOutcome>());
      expect(
        (outcome as ZipExtractOutcome).result.files.map((f) => f.name),
        ['a.txt', 'b.txt'],
      );
    });

    test('URL metadata returns typed JSON over a JSON request', () async {
      Object? body;
      final ds = UrlToolDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => body = o.data,
            respond: (_) => {
              'success': true,
              'data': {
                'url': 'https://example.com',
                'title': 'Example',
                'description': 'Demo',
                'openGraph': {'og:title': 'Example'},
              }
            },
          ),
        ),
      );
      final result = await ds.metadata('https://example.com');
      expect(body, isA<Map>());
      expect(result.title, 'Example');
      expect(result.openGraph?['og:title'], 'Example');
    });

    test('PDF text returns JSON while PDF merge returns a file', () async {
      BackendToolDataSource dsFor(Object data) => BackendToolDataSource(
            ApiClient(dio: stubDio(respond: (_) => data as Map<String, dynamic>)),
          );
      final textOut = await dsFor({
        'success': true,
        'data': {'pageCount': 1, 'pages': ['hi'], 'charCount': 2},
      }).execute(
        config: BackendToolConfigs.lookup('pdf-text')!,
        files: [pdf('a.pdf')],
      );
      final mergeOut = await dsFor(fileData('application/pdf')).execute(
        config: BackendToolConfigs.lookup('pdf-merge')!,
        files: [pdf('a.pdf'), pdf('b.pdf')],
      );
      expect(textOut, isA<JsonToolOutcome>());
      expect(mergeOut, isA<FileToolOutcome>());
    });
  });
}
