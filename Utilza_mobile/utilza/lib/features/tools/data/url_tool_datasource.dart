import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../domain/url_tool_config.dart';

/// URL tool execution. JSON requests — never multipart.
class UrlToolDataSource {
  UrlToolDataSource(this._client);
  final ApiClient _client;

  Future<UrlStatusResult> status(String url) {
    return _client.post<UrlStatusResult>(
      '/tools/url/status',
      body: {'url': url},
      fromData: (data) => UrlStatusResult.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
      auth: false,
    );
  }

  Future<UrlMetadataResult> metadata(String url) {
    return _client.post<UrlMetadataResult>(
      '/tools/url/metadata',
      body: {'url': url},
      fromData: (data) => UrlMetadataResult.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
      auth: false,
    );
  }

  Future<DnsResult> dns(String domain) {
    return _client.post<DnsResult>(
      '/tools/url/dns',
      body: {'domain': domain},
      fromData: (data) => DnsResult.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
      auth: false,
    );
  }

  Future<SslResult> ssl(String domain) {
    return _client.post<SslResult>(
      '/tools/url/ssl',
      body: {'domain': domain},
      fromData: (data) => SslResult.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
      auth: false,
    );
  }

  /// Dispatches on the exact config endpoint (never slug-derived).
  Future<Object> run(UrlToolConfig config, String input) {
    switch (config.endpoint) {
      case '/tools/url/status':
        return status(input);
      case '/tools/url/metadata':
        return metadata(input);
      case '/tools/url/dns':
        return dns(input);
      case '/tools/url/ssl':
        return ssl(input);
      default:
        throw StateError('BACKEND CONTRACT MISSING: ${config.endpoint}');
    }
  }
}
