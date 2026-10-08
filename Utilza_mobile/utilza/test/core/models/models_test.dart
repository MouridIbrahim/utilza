import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/models/models.dart';

void main() {
  group('shared models', () {
    test('PublicUser + AuthResult parse', () {
      final auth = AuthResult.fromJson({
        'user': {'id': 'u1', 'email': 'a@b.c', 'name': null},
        'token': 'jwt',
      });
      expect(auth.user.id, 'u1');
      expect(auth.user.name, isNull);
      expect(auth.token, 'jwt');
    });

    test('Category defensive with fallback fields', () {
      final full = Category.fromJson({
        'id': 'c1',
        'slug': 'pdf',
        'name': 'PDF',
        'sortOrder': 2,
        'isActive': true,
      });
      expect(full.sortOrder, 2);
      // Fallback catalogue may omit optional fields.
      final minimal = Category.fromJson({'slug': 'pdf', 'name': 'PDF'});
      expect(minimal.id, '');
      expect(minimal.isActive, isTrue);
      expect(minimal.sortOrder, 0);
      expect(minimal.createdAt, isNull);
    });

    test('Tool routes by implementation, never slug-derived', () {
      final tool = Tool.fromJson({
        'id': 't1',
        'name': 'Merge',
        'slug': 'merge-pdfs',
        'description': 'd',
        'implementation': 'backend',
        'category': {'slug': 'pdf', 'name': 'PDF'},
      });
      expect(tool.isBackend, isTrue);
      expect(tool.isFrontend, isFalse);
      expect(tool.category?.slug, 'pdf');
      expect(
        Tool.fromJson({
          'id': 't2',
          'name': 'Calc',
          'slug': 'calc',
          'description': 'd',
          'implementation': 'frontend',
        }).isFrontend,
        isTrue,
      );
    });

    test('Favorite keeps tool id (not slug)', () {
      final fav = Favorite.fromJson({
        'id': 'f1',
        'userId': 'u1',
        'toolId': 'tool-id-123',
        'createdAt': '2026-01-01T00:00:00.000Z',
        'tool': {'id': 'tool-id-123', 'name': 'N', 'slug': 's', 'icon': null},
      });
      expect(fav.toolId, 'tool-id-123');
      expect(fav.createdAt, isA<DateTime>());
    });

    test('ToolHistory + Subscription free fallback', () {
      final h = ToolHistory.fromJson({
        'id': 'h1',
        'toolSlug': 'pdf-merge',
        'inputSummary': '2 files',
        'createdAt': '2026-01-01T00:00:00.000Z',
      });
      expect(h.toolSlug, 'pdf-merge');
      expect(Subscription.fromJson({}).isFree, isTrue);
      expect(
        Subscription.fromJson({'status': 'free', 'tier': 'free'}).isFree,
        isTrue,
      );
    });

    test('FileToolResult resolves URL without double prefix', () {
      final r = FileToolResult.fromJson({
        'jobId': 'j',
        'fileId': 'f',
        'downloadUrl': '/api/v1/files/f',
        'mimeType': 'application/pdf',
        'size': 10,
        'expiresAt': '2026-01-01T01:00:00.000Z',
      });
      expect(r.fileId, 'f');
      expect(
        r.resolvedUrl(apiBaseUrl: 'https://example.com/api/v1'),
        'https://example.com/api/v1/files/f',
      );
      expect(r.expiresAt, isA<DateTime>());
    });

    test('Pagination math', () {
      final p = Pagination.fromJson<Map>(
        {'items': [1, 2], 'page': 1, 'limit': 20, 'total': 45},
        (e) => {'v': e},
      );
      expect(p.totalPages, 3);
      expect(p.hasMore, isTrue);
    });

    test('Job scaffold parses defensively', () {
      final j = Job.fromJson({'id': 'j1', 'status': 'queued'});
      expect(j.id, 'j1');
      expect(j.type, isNull);
    });
  });

  group('JSON-result models', () {
    test('PDF text/metadata/search', () {
      final text = PdfTextResult.fromJson({
        'pageCount': 2,
        'pages': ['a', 'b'],
        'charCount': 2,
      });
      expect(text.pages, ['a', 'b']);

      final meta = PdfMetadata.fromJson({'title': null, 'pageCount': 5});
      expect(meta.title, isNull);
      expect(meta.pageCount, 5);

      final search = PdfSearchResult.fromJson({
        'pageCount': 1,
        'query': 'hi',
        'matches': [
          {'page': 1, 'line': 'hi there'}
        ],
      });
      expect(search.matches.single.line, 'hi there');
    });

    test('image/document/file results', () {
      final img = ImageMetadata.fromJson({'format': 'png', 'width': 10});
      expect(img.format, 'png');

      final doc = DocumentMetadata.fromJson({'format': 'docx', 'pages': 3});
      expect(doc.pages, 3);

      final hash = FileHashResult.fromJson({
        'sha256': 'a',
        'sha512': 'b',
        'size': 3,
      });
      expect(hash.sha256, 'a');

      final type = FileTypeResult.fromJson({'type': 'pdf', 'mime': 'x'});
      expect(type.type, 'pdf');

      final fm = FileMetadataResult.fromJson({'name': 'a', 'size': 1});
      expect(fm.detectedType, isNull);

      final zip = ZipExtractResult.fromJson({
        'count': 1,
        'files': [
          {
            'fileId': 'f',
            'downloadUrl': '/api/v1/files/f',
            'name': 'a.txt',
            'size': 1,
            'mimeType': 'text/plain'
          }
        ],
      });
      expect(zip.files.single.name, 'a.txt');
    });

    test('URL results', () {
      final st = UrlStatusResult.fromJson({'url': 'https://x', 'ok': true});
      expect(st.ok, isTrue);
      expect(st.redirects, isEmpty);

      final chained = UrlStatusResult.fromJson({
        'url': 'https://x',
        'ok': true,
        'status': 200,
        'redirects': ['https://x/', 'https://x/home'],
      });
      expect(chained.redirectCount, 2);
      expect(chained.redirects.last, 'https://x/home');

      final md = UrlMetadataResult.fromJson({'url': 'https://x'});
      expect(md.title, isNull);

      final dns = DnsResult.fromJson({'domain': 'x.com', 'a': ['1.1.1.1']});
      expect(dns.a, ['1.1.1.1']);

      final ssl = SslResult.fromJson({'domain': 'x.com', 'daysLeft': 10});
      expect(ssl.daysLeft, 10);
    });
  });
}
