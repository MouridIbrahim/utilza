import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';

class HistoryRemoteDataSource {
  HistoryRemoteDataSource(this._client);
  final ApiClient _client;

  Future<Pagination<ToolHistory>> getHistory({int page = 1, int limit = 20}) {
    final safePage = page < 1 ? 1 : page;
    final safeLimit = limit < 1 ? 1 : (limit > 50 ? 50 : limit);
    return _client.get<Pagination<ToolHistory>>(
      '/history',
      query: {'page': safePage, 'limit': safeLimit},
      fromData: (data) => Pagination.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
        (item) => ToolHistory.fromJson(
          item is Map<String, dynamic> ? item : <String, dynamic>{},
        ),
      ),
    );
  }

  /// Explicit record. `inputSummary` ≤500 chars, no raw files/secrets.
  Future<ToolHistory> createHistory({
    required String toolSlug,
    String? inputSummary,
  }) {
    final summary = (inputSummary ?? '').trim();
    return _client.post<ToolHistory>(
      '/history',
      body: {
        'toolSlug': toolSlug,
        if (summary.isNotEmpty)
          'inputSummary': summary.length > 500
              ? summary.substring(0, 500)
              : summary,
      },
      fromData: (data) => ToolHistory.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
    );
  }

  Future<bool> clearHistory() {
    return _client.delete<bool>(
      '/history',
      fromData: (data) {
        if (data is Map<String, dynamic>) {
          return data['deleted'] == true;
        }
        return true;
      },
    );
  }
}
