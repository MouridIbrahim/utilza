import 'dart:convert';
import 'dart:math';

import '../domain/local_tool.dart';

/// Pure on-device text utilities. No I/O, no network.
abstract final class WordCounter {
  static LocalToolResult count(String text) {
    final chars = text.length;
    final charsNoSpaces = text.replaceAll(RegExp(r'\s'), '').length;
    final lines = text.isEmpty ? 0 : text.split('\n').length;
    final words = RegExp(r'\S+').allMatches(text).length;
    final output = 'Words: $words\n'
        'Characters: $chars\n'
        'Without spaces: $charsNoSpaces\n'
        'Lines: $lines';
    return LocalToolResult(
      summary: 'word-counter: $words words',
      output: output,
    );
  }
}

abstract final class CaseConverter {
  static String upper(String input) => input.toUpperCase();
  static String lower(String input) => input.toLowerCase();

  static String title(String input) {
    return input.splitMapJoin(
      RegExp(r'\S+'),
      onMatch: (m) {
        final word = m.group(0)!;
        if (word.isEmpty) return word;
        return word[0].toUpperCase() + word.substring(1).toLowerCase();
      },
    );
  }
}

abstract final class JsonFormatter {
  /// Pretty-prints with 2-space indent. Throws [FormatException] on
  /// invalid JSON with a human-readable message.
  static LocalToolResult format(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) {
      throw const FormatException('Enter JSON to format.');
    }
    dynamic decoded;
    try {
      decoded = jsonDecode(trimmed);
    } on FormatException catch (e) {
      throw FormatException('Invalid JSON: ${e.message}');
    }
    const encoder = JsonEncoder.withIndent('  ');
    final pretty = encoder.convert(decoded);
    return LocalToolResult(
      summary: 'json-formatter: valid JSON',
      output: pretty,
    );
  }
}

abstract final class UrlCodec {
  static LocalToolResult encode(String input) {
    final output = Uri.encodeComponent(input);
    return LocalToolResult(
      summary: 'url-codec: encoded ${input.length} chars',
      output: output,
    );
  }

  static LocalToolResult decode(String input) {
    try {
      final output = Uri.decodeComponent(input);
      return LocalToolResult(
        summary: 'url-codec: decoded ${input.length} chars',
        output: output,
      );
    } on ArgumentError {
      throw const FormatException('Invalid percent-encoding.');
    }
  }
}

abstract final class Base64Text {
  static LocalToolResult encode(String input) {
    final output = base64Encode(utf8.encode(input));
    return LocalToolResult(
      summary: 'base64-text: encoded ${input.length} chars',
      output: output,
    );
  }

  static LocalToolResult decode(String input) {
    final normalized = input.trim().replaceAll(RegExp(r'\s'), '');
    try {
      final output = utf8.decode(base64Decode(normalized));
      return LocalToolResult(
        summary: 'base64-text: decoded to ${output.length} chars',
        output: output,
      );
    } on FormatException {
      throw const FormatException('Invalid Base64 input.');
    } catch (_) {
      throw const FormatException('Invalid Base64 input.');
    }
  }
}

abstract final class PercentageCalc {
  static LocalToolResult compute(double value, double percent) {
    final result = value * percent / 100;
    return LocalToolResult(
      summary: 'percentage-calculator: $percent% of $value',
      output: '$percent% of $value = ${_trim(result)}',
    );
  }
}

abstract final class DiscountCalc {
  static LocalToolResult compute(double price, double percent) {
    if (percent < 0 || percent > 100) {
      throw const FormatException('Discount must be 0–100%.');
    }
    final saved = price * percent / 100;
    final finalPrice = price - saved;
    return LocalToolResult(
      summary: 'discount-calculator: $percent% off $price',
      output: 'Final price: ${_trim(finalPrice)}\n'
          'You save: ${_trim(saved)}',
    );
  }
}

abstract final class AgeCalc {
  /// Full years/months/days lived on [on] (defaults to today, UTC dates).
  static LocalToolResult fromBirthdate(DateTime birth, {DateTime? on}) {
    final today = on ?? DateTime.now();
    final b = DateTime(birth.year, birth.month, birth.day);
    final t = DateTime(today.year, today.month, today.day);
    if (b.isAfter(t)) {
      throw const FormatException('Birthdate is in the future.');
    }
    var years = t.year - b.year;
    var months = t.month - b.month;
    var days = t.day - b.day;
    if (days < 0) {
      months--;
      days += DateTime(t.year, t.month, 0).day;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return LocalToolResult(
      summary: 'age-calculator: $years years old',
      output: '$years years, $months months, $days days',
    );
  }
}

abstract final class DateDiff {
  static LocalToolResult daysBetween(DateTime a, DateTime b) {
    final x = DateTime(a.year, a.month, a.day);
    final y = DateTime(b.year, b.month, b.day);
    final days = y.difference(x).inDays.abs();
    return LocalToolResult(
      summary: 'date-difference: $days day(s)',
      output: '$days day(s)',
    );
  }
}

abstract final class UnitConverter {
  static const Map<String, double> _toMeters = {
    'm': 1,
    'km': 1000,
    'cm': 0.01,
    'mm': 0.001,
    'mi': 1609.344,
    'ft': 0.3048,
    'in': 0.0254,
  };

  static List<String> get units => _toMeters.keys.toList();

  static LocalToolResult convert(double value, String from, String to) {
    final a = _toMeters[from];
    final b = _toMeters[to];
    if (a == null || b == null) {
      throw const FormatException('Unknown unit.');
    }
    final result = value * a / b;
    return LocalToolResult(
      summary: 'unit-converter: $value $from',
      output: '$value $from = ${_trim(result)} $to',
    );
  }
}

abstract final class PasswordGen {
  static const _upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  static const _lower = 'abcdefghijklmnopqrstuvwxyz';
  static const _digits = '0123456789';
  static const _symbols = '!@#\$%^&*()-_=+[]{};:,.<>?';

  static LocalToolResult generate({
    int length = 16,
    bool upper = true,
    bool lower = true,
    bool digits = true,
    bool symbols = false,
    Random? random,
  }) {
    if (length < 4 || length > 128) {
      throw const FormatException('Length must be 4–128.');
    }
    var pool = '';
    if (upper) pool += _upper;
    if (lower) pool += _lower;
    if (digits) pool += _digits;
    if (symbols) pool += _symbols;
    if (pool.isEmpty) {
      throw const FormatException('Enable at least one character set.');
    }
    final rng = random ?? Random.secure();
    final password =
        List.generate(length, (_) => pool[rng.nextInt(pool.length)]).join();
    return LocalToolResult(
      summary: 'password-generator: $length chars',
      output: password,
    );
  }
}

String _trim(double v) {
  if ((v - v.roundToDouble()).abs() < 1e-9) return v.round().toString();
  return v.toStringAsFixed(2);
}
