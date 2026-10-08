import '../utils/json_helpers.dart';

// ---- PDF JSON results ----

/// POST /tools/pdf/text → `{pageCount, pages[], charCount}`. No download.
class PdfTextResult {
  const PdfTextResult({
    required this.pageCount,
    required this.pages,
    required this.charCount,
  });

  final int pageCount;
  final List<String> pages;
  final int charCount;

  factory PdfTextResult.fromJson(Map<String, dynamic> json) {
    return PdfTextResult(
      pageCount: intOf(json, 'pageCount'),
      pages: listOf(json['pages'], (e) => e.toString()),
      charCount: intOf(json, 'charCount'),
    );
  }
}

/// POST /tools/pdf/metadata. All metadata fields nullable.
class PdfMetadata {
  const PdfMetadata({
    this.title,
    this.author,
    this.subject,
    this.keywords,
    this.producer,
    this.creator,
    this.creationDate,
    this.modificationDate,
    this.pageCount,
  });

  final String? title;
  final String? author;
  final String? subject;
  final String? keywords;
  final String? producer;
  final String? creator;
  final String? creationDate;
  final String? modificationDate;
  final int? pageCount;

  factory PdfMetadata.fromJson(Map<String, dynamic> json) {
    return PdfMetadata(
      title: nullableStringOf(json, 'title'),
      author: nullableStringOf(json, 'author'),
      subject: nullableStringOf(json, 'subject'),
      keywords: nullableStringOf(json, 'keywords'),
      producer: nullableStringOf(json, 'producer'),
      creator: nullableStringOf(json, 'creator'),
      creationDate: nullableStringOf(json, 'creationDate'),
      modificationDate: nullableStringOf(json, 'modificationDate'),
      pageCount: nullableIntOf(json, 'pageCount'),
    );
  }
}

/// POST /tools/pdf/search → `{pageCount, query, matches[{page,line}]}`.
class PdfSearchResult {
  const PdfSearchResult({
    required this.pageCount,
    required this.query,
    required this.matches,
  });

  final int pageCount;
  final String query;
  final List<PdfSearchMatch> matches;

  factory PdfSearchResult.fromJson(Map<String, dynamic> json) {
    return PdfSearchResult(
      pageCount: intOf(json, 'pageCount'),
      query: stringOf(json, 'query'),
      matches: listOf(
        json['matches'],
        (e) => PdfSearchMatch.fromJson(e as Map<String, dynamic>),
      ),
    );
  }
}

class PdfSearchMatch {
  const PdfSearchMatch({required this.page, required this.line});

  final int page;
  final String line;

  factory PdfSearchMatch.fromJson(Map<String, dynamic> json) {
    return PdfSearchMatch(
      page: intOf(json, 'page'),
      line: stringOf(json, 'line'),
    );
  }
}

// ---- Image JSON results ----

/// POST /tools/image/metadata.
class ImageMetadata {
  const ImageMetadata({
    this.format,
    this.width,
    this.height,
    this.space,
    this.channels,
    this.depth,
    this.density,
    this.hasAlpha,
    this.hasProfile,
    this.isProgressive,
    this.size,
  });

  final String? format;
  final int? width;
  final int? height;
  final String? space;
  final int? channels;
  final String? depth;
  final dynamic density;
  final bool? hasAlpha;
  final bool? hasProfile;
  final bool? isProgressive;
  final int? size;

  factory ImageMetadata.fromJson(Map<String, dynamic> json) {
    bool? optBool(String key) =>
        json.containsKey(key) && json[key] is bool
            ? json[key] as bool
            : null;
    return ImageMetadata(
      format: nullableStringOf(json, 'format'),
      width: nullableIntOf(json, 'width'),
      height: nullableIntOf(json, 'height'),
      space: nullableStringOf(json, 'space'),
      channels: nullableIntOf(json, 'channels'),
      depth: nullableStringOf(json, 'depth'),
      density: json['density'],
      hasAlpha: optBool('hasAlpha'),
      hasProfile: optBool('hasProfile'),
      isProgressive: optBool('isProgressive'),
      size: nullableIntOf(json, 'size'),
    );
  }
}

// ---- Document JSON results ----

/// POST /tools/document/metadata. DOCX and XLSX share/omit fields.
class DocumentMetadata {
  const DocumentMetadata({
    this.format,
    this.title,
    this.creator,
    this.subject,
    this.keywords,
    this.created,
    this.modified,
    this.application,
    this.pages,
    this.words,
    this.sheets,
  });

  final String? format;
  final String? title;
  final String? creator;
  final String? subject;
  final String? keywords;
  final String? created;
  final String? modified;
  final String? application;
  final int? pages;
  final int? words;
  final dynamic sheets;

  factory DocumentMetadata.fromJson(Map<String, dynamic> json) {
    return DocumentMetadata(
      format: nullableStringOf(json, 'format'),
      title: nullableStringOf(json, 'title'),
      creator: nullableStringOf(json, 'creator'),
      subject: nullableStringOf(json, 'subject'),
      keywords: nullableStringOf(json, 'keywords'),
      created: nullableStringOf(json, 'created'),
      modified: nullableStringOf(json, 'modified'),
      application: nullableStringOf(json, 'application'),
      pages: nullableIntOf(json, 'pages'),
      words: nullableIntOf(json, 'words'),
      sheets: json['sheets'],
    );
  }
}

// ---- File JSON results ----

/// POST /tools/file/hash → `{sha256, sha512, size}`. Bytes not stored.
class FileHashResult {
  const FileHashResult({
    required this.sha256,
    required this.sha512,
    required this.size,
  });

  final String sha256;
  final String sha512;
  final int size;

  factory FileHashResult.fromJson(Map<String, dynamic> json) {
    return FileHashResult(
      sha256: stringOf(json, 'sha256'),
      sha512: stringOf(json, 'sha512'),
      size: intOf(json, 'size'),
    );
  }
}

/// POST /tools/file/type → `{type, mime}` via content sniffing.
class FileTypeResult {
  const FileTypeResult({required this.type, required this.mime});

  final String type;
  final String mime;

  factory FileTypeResult.fromJson(Map<String, dynamic> json) {
    return FileTypeResult(
      type: stringOf(json, 'type'),
      mime: stringOf(json, 'mime'),
    );
  }
}

/// POST /tools/file/metadata.
class FileMetadataResult {
  const FileMetadataResult({
    required this.name,
    required this.size,
    this.declaredMime,
    this.detectedType,
    this.detectedMime,
    this.sha256,
    this.textLines,
  });

  final String name;
  final int size;
  final String? declaredMime;
  final String? detectedType;
  final String? detectedMime;
  final String? sha256;
  final int? textLines;

  factory FileMetadataResult.fromJson(Map<String, dynamic> json) {
    return FileMetadataResult(
      name: stringOf(json, 'name'),
      size: intOf(json, 'size'),
      declaredMime: nullableStringOf(json, 'declaredMime'),
      detectedType: nullableStringOf(json, 'detectedType'),
      detectedMime: nullableStringOf(json, 'detectedMime'),
      sha256: nullableStringOf(json, 'sha256'),
      textLines: nullableIntOf(json, 'textLines'),
    );
  }
}

// ---- URL JSON results (JSON requests, not multipart) ----

/// POST /tools/url/status.
class UrlStatusResult {
  const UrlStatusResult({
    required this.url,
    required this.ok,
    this.status,
    this.finalUrl,
    this.redirects = const [],
    this.contentType,
    this.size,
  });

  final String url;
  final bool ok;
  final int? status;
  final String? finalUrl;

  /// Redirect chain. The backend returns a list of URLs.
  final List<String> redirects;
  final String? contentType;
  final int? size;

  int get redirectCount => redirects.length;

  factory UrlStatusResult.fromJson(Map<String, dynamic> json) {
    final raw = json['redirects'];
    return UrlStatusResult(
      url: stringOf(json, 'url'),
      ok: boolOf(json, 'ok'),
      status: nullableIntOf(json, 'status'),
      finalUrl: nullableStringOf(json, 'finalUrl'),
      redirects: raw is List
          ? [for (final e in raw) e.toString()]
          : switch (nullableIntOf(json, 'redirects')) {
              int n => List.filled(n, ''),
              null => const [],
            },
      contentType: nullableStringOf(json, 'contentType'),
      size: nullableIntOf(json, 'size'),
    );
  }
}

/// POST /tools/url/metadata. HTML only.
class UrlMetadataResult {
  const UrlMetadataResult({
    required this.url,
    this.title,
    this.description,
    this.openGraph,
  });

  final String url;
  final String? title;
  final String? description;
  final Map<String, dynamic>? openGraph;

  factory UrlMetadataResult.fromJson(Map<String, dynamic> json) {
    final og = json['openGraph'];
    return UrlMetadataResult(
      url: stringOf(json, 'url'),
      title: nullableStringOf(json, 'title'),
      description: nullableStringOf(json, 'description'),
      openGraph: og is Map<String, dynamic> ? og : null,
    );
  }
}

/// POST /tools/url/dns.
class DnsResult {
  const DnsResult({
    required this.domain,
    this.a = const [],
    this.aaaa = const [],
    this.mx = const [],
    this.txt = const [],
    this.ns = const [],
  });

  final String domain;
  final List<String> a;
  final List<String> aaaa;
  final List<String> mx;
  final List<String> txt;
  final List<String> ns;

  factory DnsResult.fromJson(Map<String, dynamic> json) {
    List<String> strs(dynamic v) => listOf(v, (e) => e.toString());
    return DnsResult(
      domain: stringOf(json, 'domain'),
      a: strs(json['a']),
      aaaa: strs(json['aaaa']),
      mx: strs(json['mx']),
      txt: strs(json['txt']),
      ns: strs(json['ns']),
    );
  }
}

/// POST /tools/url/ssl. Port fixed to 443.
class SslResult {
  const SslResult({
    required this.domain,
    this.subject,
    this.issuer,
    this.validFrom,
    this.validTo,
    this.daysLeft,
    this.fingerprint256,
  });

  final String domain;
  final String? subject;
  final String? issuer;
  final String? validFrom;
  final String? validTo;
  final int? daysLeft;
  final String? fingerprint256;

  factory SslResult.fromJson(Map<String, dynamic> json) {
    return SslResult(
      domain: stringOf(json, 'domain'),
      subject: nullableStringOf(json, 'subject'),
      issuer: nullableStringOf(json, 'issuer'),
      validFrom: nullableStringOf(json, 'validFrom'),
      validTo: nullableStringOf(json, 'validTo'),
      daysLeft: nullableIntOf(json, 'daysLeft'),
      fingerprint256: nullableStringOf(json, 'fingerprint256'),
    );
  }
}
