import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/errors/api_exception.dart';
import 'package:utilza/core/network/api_envelope.dart';

void main() {
  group('envelope parsing', () {
    test('parses success envelope', () {
      final json = {
        'success': true,
        'data': {'id': '1', 'email': 'a@b.c'}
      };
      final result = ApiSuccess.parse<Map<String, dynamic>>(
        json,
        (data) => data as Map<String, dynamic>,
      );
      expect(result.data['id'], '1');
    });

    test('parses error envelope with details', () {
      final json = {
        'success': false,
        'error': {
          'code': 'VALIDATION_ERROR',
          'message': 'Bad input.',
          'details': {'email': 'invalid'}
        }
      };
      final err = ApiErrorResponse.fromJson(json);
      expect(err.error.code, 'VALIDATION_ERROR');
      expect(err.error.message, 'Bad input.');
      expect(err.error.details, {'email': 'invalid'});
    });

    test('unwrapEnvelope returns data on success', () {
      final data = unwrapEnvelope({
        'success': true,
        'data': {'x': 1}
      });
      expect((data as Map)['x'], 1);
    });

    test('unwrapEnvelope throws ApiErrorResponse on failure', () {
      expect(
        () => unwrapEnvelope({
          'success': false,
          'error': {'code': 'UNAUTHORIZED', 'message': 'Nope'}
        }),
        throwsA(isA<ApiErrorResponse>()),
      );
    });

    test('production error has only code+message (details nullable)', () {
      final err = ApiErrorBody.fromJson(
        {'code': 'NOT_FOUND', 'message': 'Missing'},
      );
      expect(err.details, isNull);
      expect(
        const ApiException(code: 'NOT_FOUND', message: 'Missing').code,
        'NOT_FOUND',
      );
    });
  });
}
