/// URL tools use JSON requests, never multipart.
enum UrlToolKind { status, metadata, dns, ssl }

class UrlToolConfig {
  const UrlToolConfig({
    required this.endpoint,
    required this.kind,
    required this.inputLabel,
    required this.inputHint,
    this.isDomainInput = false,
  });

  final String endpoint;
  final UrlToolKind kind;
  final String inputLabel;
  final String inputHint;
  final bool isDomainInput;

  String? validate(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return '$inputLabel is required.';
    if (v.length > 2000) return 'Maximum 2000 characters.';
    if (isDomainInput) {
      if (v.contains('://') || v.contains(' ') || v.contains('/')) {
        return 'Enter a bare hostname, e.g. example.com.';
      }
      return null;
    }
    final uri = Uri.tryParse(v);
    if (uri == null ||
        !(uri.scheme == 'http' || uri.scheme == 'https') ||
        uri.host.isEmpty) {
      return 'Enter a public http(s) URL.';
    }
    return null;
  }
}

const _urlStatus = UrlToolConfig(
  endpoint: '/tools/url/status',
  kind: UrlToolKind.status,
  inputLabel: 'URL',
  inputHint: 'https://example.com',
);

const _urlMetadata = UrlToolConfig(
  endpoint: '/tools/url/metadata',
  kind: UrlToolKind.metadata,
  inputLabel: 'URL',
  inputHint: 'https://example.com (HTML pages only)',
);

const _urlDns = UrlToolConfig(
  endpoint: '/tools/url/dns',
  kind: UrlToolKind.dns,
  inputLabel: 'Domain',
  inputHint: 'example.com',
  isDomainInput: true,
);

const _urlSsl = UrlToolConfig(
  endpoint: '/tools/url/ssl',
  kind: UrlToolKind.ssl,
  inputLabel: 'Domain',
  inputHint: 'example.com (port 443)',
  isDomainInput: true,
);

/// Explicit slug → config map. Endpoints come only from this table.
abstract final class UrlToolConfigs {
  static const Map<String, UrlToolConfig> _configs = {
    'url-status': _urlStatus,
    'url-metadata': _urlMetadata,
    'url-dns': _urlDns,
    'url-ssl': _urlSsl,
    // Real catalogue aliases (verified against utilza_backend).
    'dns-lookup': _urlDns,
    'ssl-check': _urlSsl,
  };

  static UrlToolConfig? lookup(String slug) {
    final direct = _configs[slug.trim().toLowerCase()];
    if (direct != null) return direct;
    final want = slug.trim().toLowerCase().replaceAll(
          RegExp(r'[^a-z0-9]'),
          '',
        );
    for (final entry in _configs.entries) {
      if (entry.key.replaceAll('-', '') == want) return entry.value;
    }
    return null;
  }

  static Set<String> get configuredSlugs => _configs.keys.toSet();
}
