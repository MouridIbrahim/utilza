import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/constants/api_constants.dart';
import 'package:utilza/core/network/multipart_helper.dart';

void main() {
  group('multipart field names', () {
    test('tools use `files`, validator stub uses `file`', () {
      expect(MultipartHelper.fieldForTools(), 'files');
      expect(MultipartHelper.fieldForValidatorStub(), 'file');
      expect(ApiConstants.multipartFieldFiles, 'files');
      expect(ApiConstants.multipartFieldSingleFile, 'file');
    });

    test('buildFormData uses given field name and stringifies fields', () {
      final mp = MultipartFile.fromString('a', filename: 'a.pdf');
      final form = MultipartHelper.buildFormData(
        files: [mp, mp],
        fieldName: 'files',
        fields: {'ranges': '1-3', 'n': 2, 'skip': null},
      );
      expect(form.files.map((e) => e.key), everyElement('files'));
      expect(form.fields.map((e) => e.key), containsAll(['ranges', 'n']));
      expect(form.fields.map((e) => e.key), isNot(contains('skip')));
    });
  });

  group('cleanQuery', () {
    test('omits null and empty strings', () {
      expect(
        cleanQuery({
          'category': 'pdf',
          'search': '',
          'page': 1,
          'limit': 20,
          'x': null,
        }),
        {'category': 'pdf', 'page': 1, 'limit': 20},
      );
    });
  });

  group('validateFileSelection', () {
    test('enforces count limits', () {
      expect(
        validateFileSelection(
          count: 1,
          fileNames: const ['a.pdf'],
          fileSizes: const [10],
          minFiles: 2,
          maxFiles: 20,
        ),
        contains('at least 2'),
      );
      expect(
        validateFileSelection(
          count: 21,
          fileNames: List.filled(21, 'a.pdf'),
          fileSizes: List.filled(21, 10),
          minFiles: 2,
          maxFiles: 20,
        ),
        contains('at most 20'),
      );
    });

    test('enforces extensions and sizes', () {
      expect(
        validateFileSelection(
          count: 1,
          fileNames: const ['a.exe'],
          fileSizes: const [10],
          minFiles: 1,
          maxFiles: 1,
          allowedExtensions: const {'pdf'},
        ),
        contains('Unsupported file type'),
      );
      expect(
        validateFileSelection(
          count: 1,
          fileNames: const ['a.pdf'],
          fileSizes: const [11 * 1024 * 1024],
          minFiles: 1,
          maxFiles: 1,
          maxSizePerFile: 10 * 1024 * 1024,
        ),
        contains('too large'),
      );
      expect(
        validateFileSelection(
          count: 1,
          fileNames: const ['a.pdf'],
          fileSizes: const [1024],
          minFiles: 1,
          maxFiles: 1,
          allowedExtensions: const {'pdf'},
          maxSizePerFile: 10 * 1024 * 1024,
        ),
        isNull,
      );
    });
  });
}
