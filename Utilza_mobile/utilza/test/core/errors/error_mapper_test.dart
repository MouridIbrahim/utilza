import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/errors/error_mapper.dart';

void main() {
  group('ErrorMapper.fromResponse', () {
    test('preserves backend code + message', () {
      final e = ErrorMapper.fromResponse(400, {
        'success': false,
        'error': {'code': 'VALIDATION_ERROR', 'message': 'Bad.'}
      });
      expect(e.statusCode, 400);
      expect(e.code, 'VALIDATION_ERROR');
      expect(e.message, 'Bad.');
    });

    test('preserves details in dev responses', () {
      final e = ErrorMapper.fromResponse(400, {
        'success': false,
        'error': {
          'code': 'VALIDATION_ERROR',
          'message': 'Bad.',
          'details': {'f': 'x'}
        }
      });
      expect(e.details, {'f': 'x'});
    });

    test('maps 401/410/429/501 codes', () {
      expect(ErrorMapper.fromResponse(401, null).code, 'UNAUTHORIZED');
      expect(ErrorMapper.fromResponse(410, null).code, 'FILE_EXPIRED');
      expect(ErrorMapper.fromResponse(429, null).code, 'RATE_LIMITED');
      expect(ErrorMapper.fromResponse(501, null).code, 'NOT_IMPLEMENTED');
    });

    test('userMessage for expiry asks to rerun', () {
      final e = ErrorMapper.fromResponse(410, {
        'success': false,
        'error': {'code': 'FILE_EXPIRED', 'message': 'gone'}
      });
      expect(ErrorMapper.userMessage(e), contains('run the tool again'));
    });

    test('fromDio maps timeouts without leaking internals', () {
      final e = ErrorMapper.fromDio(
        DioException(
          requestOptions: RequestOptions(path: '/x'),
          type: DioExceptionType.connectionTimeout,
        ),
      );
      expect(e.code, 'TIMEOUT');
    });

    test('fromDio preserves backend 409 ALREADY_FAVORITED', () {
      final e = ErrorMapper.fromDio(
        DioException(
          requestOptions: RequestOptions(path: '/favorites'),
          type: DioExceptionType.badResponse,
          response: Response(
            requestOptions: RequestOptions(path: '/favorites'),
            statusCode: 409,
            data: {
              'success': false,
              'error': {'code': 'ALREADY_FAVORITED', 'message': 'dup'}
            },
          ),
        ),
      );
      expect(e.code, 'ALREADY_FAVORITED');
      expect(e.statusCode, 409);
    });
  });
}
