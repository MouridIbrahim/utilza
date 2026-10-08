/// On-device tool contract. Frontend (`implementation == "frontend"`)
/// catalogue entries execute here. Never call the backend from a local
/// tool and never fake an API request.
enum LocalToolKind {
  wordCounter,
  caseConverter,
  jsonFormatter,
  urlCodec,
  base64Text,
  percentage,
  discount,
  age,
  dateDiff,
  unitConverter,
  password,
  qr,
}

/// Pure result of a local computation.
class LocalToolResult {
  const LocalToolResult({required this.summary, required this.output});

  /// Short metric line, safe for history `inputSummary` (no raw text).
  final String summary;

  /// Full display output.
  final String output;
}
