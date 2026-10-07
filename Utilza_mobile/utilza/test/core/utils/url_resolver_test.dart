import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/utils/url_resolver.dart';

void main() {
  group('resolveDownloadUrl', () {
    test('keeps absolute URLs as-is', () {
      expect(
        resolveDownloadUrl('https://cdn.example.com/f/abc'),
        'https://cdn.example.com/f/abc',
      );
    });

    test('does not double-prefix /api/v1', () {
      final resolved = resolveDownloadUrl(
        '/api/v1/files/abc',
        apiBaseUrl: 'https://example.com/api/v1',
      );
      expect(resolved, 'https://example.com/api/v1/files/abc');
    });

    test('resolves relative paths against origin', () {
      final resolved = resolveDownloadUrl(
        '/api/v1/files/abc',
        apiBaseUrl: 'http://localhost:3000/api/v1',
      );
      expect(resolved, 'http://localhost:3000/api/v1/files/abc');
    });
  });

  group('fileIdFromDownloadUrl', () {
    test('extracts file id', () {
      expect(
        fileIdFromDownloadUrl('https://example.com/api/v1/files/abc123'),
        'abc123',
      );
    });

    test('returns null when no files segment', () {
      expect(fileIdFromDownloadUrl('https://example.com/other'), isNull);
    });
  });
}
