import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/models/models.dart';
import 'package:utilza/features/tools/data/local_tools.dart';
import 'package:utilza/features/tools/domain/local_tool_registry.dart';

Tool frontend(String slug) => Tool.fromJson({
      'id': 't-$slug',
      'name': 'Tool $slug',
      'slug': slug,
      'description': 'desc',
      'implementation': 'frontend',
    });

Tool backend(String slug) => Tool.fromJson({
      'id': 't-$slug',
      'name': 'Tool $slug',
      'slug': slug,
      'description': 'desc',
      'implementation': 'backend',
    });

void main() {
  group('word counter', () {
    test('counts words, chars, lines', () {
      final r = WordCounter.count('hello world\nsecond line');
      expect(r.output, contains('Words: 4'));
      expect(r.output, contains('Lines: 2'));
      expect(r.summary, 'word-counter: 4 words');
    });

    test('empty input yields zeros', () {
      final r = WordCounter.count('');
      expect(r.output, contains('Words: 0'));
    });
  });

  group('case converter', () {
    test('upper/lower/title', () {
      expect(CaseConverter.upper('hi'), 'HI');
      expect(CaseConverter.lower('HI'), 'hi');
      expect(CaseConverter.title('hello world'), 'Hello World');
    });
  });

  group('json formatter', () {
    test('pretty-prints valid JSON', () {
      final r = JsonFormatter.format('{"b":2,"a":1}');
      expect(r.output, contains('\n'));
      expect(r.summary, 'json-formatter: valid JSON');
    });

    test('rejects invalid JSON without leaking internals', () {
      expect(
        () => JsonFormatter.format('{bad}'),
        throwsA(isA<FormatException>()),
      );
      expect(
        () => JsonFormatter.format('   '),
        throwsA(isA<FormatException>()),
      );
    });
  });

  group('url codec', () {
    test('roundtrip', () {
      const raw = 'hello world & more?';
      final encoded = UrlCodec.encode(raw).output;
      expect(encoded, isNot(contains(' ')));
      expect(UrlCodec.decode(encoded).output, raw);
    });

    test('invalid decode throws FormatException', () {
      expect(() => UrlCodec.decode('%ZZ'), throwsA(isA<FormatException>()));
    });
  });

  group('base64 text', () {
    test('roundtrip utf-8', () {
      const raw = 'hello ✓';
      final encoded = Base64Text.encode(raw).output;
      expect(Base64Text.decode(encoded).output, raw);
    });

    test('invalid input throws FormatException', () {
      expect(
        () => Base64Text.decode('!!! not base64 !!!'),
        throwsA(isA<FormatException>()),
      );
    });
  });

  group('calculators and generators (real catalogue tools)', () {
    test('percentage and discount math', () {
      final pct = PercentageCalc.compute(200, 15);
      expect(pct.output, '15.0% of 200.0 = 30');
      final disc = DiscountCalc.compute(100, 20);
      expect(disc.output, contains('Final price: 80'));
      expect(disc.output, contains('You save: 20'));
      expect(
        () => DiscountCalc.compute(100, 150),
        throwsA(isA<FormatException>()),
      );
    });

    test('age and date difference', () {
      final age = AgeCalc.fromBirthdate(
        DateTime(2000, 1, 15),
        on: DateTime(2026, 10, 8),
      );
      expect(age.output, '26 years, 8 months, 23 days');
      expect(
        () => AgeCalc.fromBirthdate(
          DateTime(2030, 1, 1),
          on: DateTime(2026, 10, 8),
        ),
        throwsA(isA<FormatException>()),
      );
      final diff = DateDiff.daysBetween(
        DateTime(2026, 1, 1),
        DateTime(2026, 1, 31),
      );
      expect(diff.output, '30 day(s)');
    });

    test('unit conversion roundtrip', () {
      final out = UnitConverter.convert(1, 'km', 'm');
      expect(out.output, '1.0 km = 1000 m');
      expect(
        UnitConverter.convert(12, 'in', 'ft').output,
        '12.0 in = 1 ft',
      );
      expect(() => UnitConverter.convert(1, 'km', 'xx'),
          throwsA(isA<FormatException>()));
    });

    test('password properties and validation', () {
      final first = PasswordGen.generate(length: 16);
      expect(first.output.length, 16);
      expect(
        PasswordGen.generate(length: 16).output,
        isNot(first.output),
        reason: 'secure random must differ',
      );
      expect(
        () => PasswordGen.generate(length: 3),
        throwsA(isA<FormatException>()),
      );
      expect(
        () => PasswordGen.generate(
          length: 16,
          upper: false,
          lower: false,
          digits: false,
          symbols: false,
        ),
        throwsA(isA<FormatException>()),
      );
      final digitsOnly = PasswordGen.generate(
        length: 8,
        upper: false,
        lower: false,
        symbols: false,
      );
      expect(RegExp(r'^[0-9]{8}$').hasMatch(digitsOnly.output), isTrue);
    });

    test('real frontend slugs resolve locally', () {
      for (final slug in [
        'character-counter',
        'percentage-calculator',
        'discount-calculator',
        'age-calculator',
        'date-difference',
        'unit-converter',
        'password-generator',
        'qr-generator',
      ]) {
        expect(
          LocalToolRegistry.resolve(frontend(slug)),
          isNotNull,
          reason: slug,
        );
      }
    });
  });

  group('registry is catalogue-driven, never slug-derives endpoints', () {
    test('resolves known frontend slugs case-insensitively', () {
      expect(
        LocalToolRegistry.resolve(frontend('word-counter'))?.name,
        'wordCounter',
      );
      expect(
        LocalToolRegistry.resolve(frontend('JSON-FORMATTER'))?.name,
        'jsonFormatter',
      );
      expect(
        LocalToolRegistry.resolveSlug('url-encoder'),
        isNotNull,
      );
    });

    test('unknown frontend slug returns null (coming soon, no backend call)',
        () {
      expect(LocalToolRegistry.resolve(frontend('mystery-tool')), isNull);
    });

    test('backend tools never resolve locally', () {
      expect(LocalToolRegistry.resolve(backend('pdf-merge')), isNull);
      // Even if a backend slug collides with a local alias, no local run.
      expect(LocalToolRegistry.resolve(backend('word-counter')), isNull);
    });

    test('summaries stay short and never echo raw input', () {
      final long = List.filled(5000, 'x').join();
      final r = WordCounter.count(long);
      expect(r.summary.length, lessThanOrEqualTo(500));
      expect(r.summary, isNot(contains(long)));
    });
  });
}
