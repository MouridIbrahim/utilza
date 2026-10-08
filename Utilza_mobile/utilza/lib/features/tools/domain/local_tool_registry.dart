import '../../../core/models/models.dart';
import 'local_tool.dart';

/// Resolves a catalogue [Tool] to an on-device implementation.
/// Catalogue-driven: callers pass the backend-provided tool, never a
/// hardcoded assumption. Returns null when no local implementation
/// exists for the slug — callers must show "coming soon" and must NOT
/// fall back to a backend call.
abstract final class LocalToolRegistry {
  static const _aliases = <String, LocalToolKind>{
    'word-counter': LocalToolKind.wordCounter,
    'word_counter': LocalToolKind.wordCounter,
    'word-count': LocalToolKind.wordCounter,
    'text-counter': LocalToolKind.wordCounter,
    'character-counter': LocalToolKind.wordCounter,
    'case-converter': LocalToolKind.caseConverter,
    'text-case': LocalToolKind.caseConverter,
    'change-case': LocalToolKind.caseConverter,
    'json-formatter': LocalToolKind.jsonFormatter,
    'json-pretty': LocalToolKind.jsonFormatter,
    'json-beautifier': LocalToolKind.jsonFormatter,
    'url-encoder': LocalToolKind.urlCodec,
    'url-decoder': LocalToolKind.urlCodec,
    'url-encoder-decoder': LocalToolKind.urlCodec,
    'url-codec': LocalToolKind.urlCodec,
    'base64-text': LocalToolKind.base64Text,
    'base64-encode-text': LocalToolKind.base64Text,
    'base64-decode-text': LocalToolKind.base64Text,
    // Real catalogue frontend tools (verified against utilza_backend).
    'character_counter': LocalToolKind.wordCounter,
    'percentage-calculator': LocalToolKind.percentage,
    'discount-calculator': LocalToolKind.discount,
    'age-calculator': LocalToolKind.age,
    'date-difference': LocalToolKind.dateDiff,
    'unit-converter': LocalToolKind.unitConverter,
    'password-generator': LocalToolKind.password,
    'password_generator': LocalToolKind.password,
    'qr-generator': LocalToolKind.qr,
    'qr_generator': LocalToolKind.qr,
  };

  static LocalToolKind? resolve(Tool tool) {
    if (!tool.isFrontend) return null;
    return _aliases[tool.slug.trim().toLowerCase()];
  }

  static LocalToolKind? resolveSlug(String slug) {
    return _aliases[slug.trim().toLowerCase()];
  }
}
