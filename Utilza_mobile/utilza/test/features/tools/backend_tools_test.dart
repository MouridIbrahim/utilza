import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/network/api_client.dart';
import 'package:utilza/features/tools/data/url_tool_datasource.dart';
import 'package:utilza/features/tools/domain/backend_tool_configs.dart';
import 'package:utilza/features/tools/domain/tool_executor_config.dart';
import 'package:utilza/features/tools/domain/url_tool_config.dart';

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

void main() {
  group('registry coverage', () {
    test('80 multipart + 6 URL configs, all exact /tools/ routes', () {
      expect(BackendToolConfigs.configuredSlugs.length, 80);
      expect(UrlToolConfigs.configuredSlugs.length, 6);
      for (final slug in BackendToolConfigs.configuredSlugs) {
        final config = BackendToolConfigs.lookup(slug)!;
        expect(
          config.endpoint.startsWith('/tools/'),
          isTrue,
          reason: '$slug -> ${config.endpoint}',
        );
        expect(config.fileField, 'files');
      }
      for (final slug in UrlToolConfigs.configuredSlugs) {
        final config = UrlToolConfigs.lookup(slug)!;
        expect(config.endpoint.startsWith('/tools/url/'), isTrue);
      }
    });

    test('spot-check exact endpoints per family', () {
      expect(
        BackendToolConfigs.lookup('pdf-merge')?.endpoint,
        '/tools/pdf/merge',
      );
      expect(
        BackendToolConfigs.lookup('pdf-to-image')?.endpoint,
        '/tools/pdf/to-image',
      );
      expect(
        BackendToolConfigs.lookup('pdf-metadata-edit')?.endpoint,
        '/tools/pdf/metadata-edit',
      );
      expect(
        BackendToolConfigs.lookup('image-montage')?.endpoint,
        '/tools/image/montage',
      );
      expect(
        BackendToolConfigs.lookup('image-metadata')?.endpoint,
        '/tools/image/metadata',
      );
      expect(
        BackendToolConfigs.lookup('document-to-pdf')?.endpoint,
        '/tools/document/to-pdf',
      );
      expect(
        BackendToolConfigs.lookup('markdown-to-html')?.endpoint,
        '/tools/document/markdown-to-html',
      );
      expect(
        BackendToolConfigs.lookup('file-zip-extract')?.endpoint,
        '/tools/file/zip-extract',
      );
      expect(
        BackendToolConfigs.lookup('file-tar-to-zip')?.endpoint,
        '/tools/file/tar-to-zip',
      );
      expect(
        UrlToolConfigs.lookup('url-status')?.endpoint,
        '/tools/url/status',
      );
      expect(UrlToolConfigs.lookup('url-ssl')?.endpoint, '/tools/url/ssl');
    });

    test('spot-check file constraints', () {
      final merge = BackendToolConfigs.lookup('pdf-merge')!;
      expect(merge.minFiles, 2);
      expect(merge.maxFiles, 20);
      expect(merge.allowedExtensions, {'pdf'});

      final fromImage = BackendToolConfigs.lookup('pdf-from-image')!;
      expect(fromImage.maxFiles, 10);

      final sign = BackendToolConfigs.lookup('pdf-sign')!;
      expect(sign.minFiles, 2);
      expect(sign.maxFiles, 2);

      final montage = BackendToolConfigs.lookup('image-montage')!;
      expect(montage.minFiles, 2);
      expect(montage.maxFiles, 9);

      final zipCreate = BackendToolConfigs.lookup('file-zip-create')!;
      expect(zipCreate.minFiles, 2);
      expect(zipCreate.maxCombinedSize, 50 * 1024 * 1024);

      final b64enc = BackendToolConfigs.lookup('file-base64-encode')!;
      expect(b64enc.maxSizePerFile, 5 * 1024 * 1024);
    });

    test('spot-check result types (never assume FileToolResult)', () {
      expect(
        BackendToolConfigs.lookup('pdf-text')?.resultType,
        ToolResultType.json,
      );
      expect(
        BackendToolConfigs.lookup('pdf-search')?.resultType,
        ToolResultType.json,
      );
      expect(
        BackendToolConfigs.lookup('image-metadata')?.resultType,
        ToolResultType.json,
      );
      expect(
        BackendToolConfigs.lookup('file-hash')?.resultType,
        ToolResultType.json,
      );
      expect(
        BackendToolConfigs.lookup('file-zip-extract')?.resultType,
        ToolResultType.zipExtract,
      );
      expect(
        BackendToolConfigs.lookup('pdf-merge')?.resultType,
        ToolResultType.file,
      );
    });

    test('safety notices are present', () {
      expect(
        BackendToolConfigs.lookup('pdf-redact')?.notice,
        contains('extractable'),
      );
      expect(
        BackendToolConfigs.lookup('pdf-sign')?.notice,
        contains('NOT a cryptographic'),
      );
      expect(
        BackendToolConfigs.lookup('image-passport')?.notice,
        contains('face detection'),
      );
    });

    test('cross-field validators', () {
      final hf = BackendToolConfigs.lookup('pdf-header-footer')!;
      expect(hf.extraValidate!({}, 1), isNotNull);
      expect(
        hf.extraValidate!({'header': 'Hi'}, 1),
        isNull,
      );
      final meta = BackendToolConfigs.lookup('pdf-metadata-edit')!;
      expect(meta.extraValidate!({}, 1), isNotNull);
      expect(
        meta.extraValidate!({'title': 'T'}, 1),
        isNull,
      );
      final rename = BackendToolConfigs.lookup('file-rename')!;
      expect(
        rename.extraValidate!({'pattern': 'doc'}, 2),
        contains('{i}'),
      );
      expect(
        rename.extraValidate!({'pattern': 'doc-{i}'}, 2),
        isNull,
      );
      final resize = BackendToolConfigs.lookup('image-resize')!;
      expect(resize.extraValidate!({}, 1), isNotNull);
      expect(
        resize.extraValidate!({'width': 100}, 1),
        isNull,
      );
      final montage = BackendToolConfigs.lookup('image-montage')!;
      expect(
        montage.extraValidate!({'cols': 2, 'rows': 2}, 3),
        contains('2 × 2'),
      );
      expect(
        montage.extraValidate!({'cols': 2, 'rows': 2}, 4),
        isNull,
      );
    });

    test('real catalogue aliases resolve to the exact table endpoint', () {
      expect(
        BackendToolConfigs.lookup('pdf-page-delete')?.endpoint,
        '/tools/pdf/delete-pages',
      );
      expect(
        BackendToolConfigs.lookup('image-to-pdf')?.endpoint,
        '/tools/pdf/from-image',
      );
      expect(
        BackendToolConfigs.lookup('word-to-pdf')?.endpoint,
        '/tools/document/to-pdf',
      );
      expect(
        BackendToolConfigs.lookup('zip-create')?.endpoint,
        '/tools/file/zip-create',
      );
      expect(
        BackendToolConfigs.lookup('tar-to-zip')?.endpoint,
        '/tools/file/tar-to-zip',
      );
      expect(
        UrlToolConfigs.lookup('dns-lookup')?.endpoint,
        '/tools/url/dns',
      );
      expect(
        UrlToolConfigs.lookup('ssl-check')?.endpoint,
        '/tools/url/ssl',
      );
    });

    test('lookup tolerates separators/case, unknown stays null', () {
      expect(BackendToolConfigs.lookup('PDF-Merge')?.endpoint,
          '/tools/pdf/merge');
      expect(BackendToolConfigs.lookup('pdf_merge'), isNotNull);
      expect(BackendToolConfigs.lookup('no-such-tool'), isNull);
      expect(UrlToolConfigs.lookup('url_status')?.endpoint,
          '/tools/url/status');
      expect(UrlToolConfigs.lookup('nope'), isNull);
    });
  });

  group('URL datasource uses JSON, never multipart', () {
    test('status posts {url} and parses typed result', () async {
      Object? body;
      String? path;
      final ds = UrlToolDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) {
              path = o.path;
              body = o.data;
            },
            respond: (_) => {
              'success': true,
              'data': {
                'url': 'https://example.com',
                'ok': true,
                'status': 200,
                'finalUrl': 'https://example.com/',
                'redirects': 0,
                'contentType': 'text/html',
                'size': 100,
              }
            },
          ),
        ),
      );
      final result = await ds.status('https://example.com');
      expect(path, '/tools/url/status');
      expect(body, isA<Map>());
      expect(body, isNot(isA<FormData>()));
      expect((body as Map)['url'], 'https://example.com');
      expect(result.ok, isTrue);
      expect(result.status, 200);
    });

    test('dns/ssl post {domain}', () async {
      final bodies = <Object?>[];
      final ds = UrlToolDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => bodies.add(o.data),
            respond: (o) => {
              'success': true,
              'data': o.path.endsWith('/dns')
                  ? {'domain': 'example.com', 'a': ['1.1.1.1']}
                  : {'domain': 'example.com', 'daysLeft': 30},
            },
          ),
        ),
      );
      final dns = await ds.dns('example.com');
      final ssl = await ds.ssl('example.com');
      expect((bodies[0] as Map)['domain'], 'example.com');
      expect((bodies[1] as Map)['domain'], 'example.com');
      expect(dns.a, ['1.1.1.1']);
      expect(ssl.daysLeft, 30);
    });

    test('URL input validators', () {
      final status = UrlToolConfigs.lookup('url-status')!;
      expect(status.validate(''), isNotNull);
      expect(status.validate('ftp://x'), isNotNull);
      expect(status.validate('https://example.com'), isNull);
      final dns = UrlToolConfigs.lookup('url-dns')!;
      expect(dns.validate('https://example.com'), isNotNull);
      expect(dns.validate('example.com'), isNull);
    });
  });
}
