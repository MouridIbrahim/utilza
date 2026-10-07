import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';

class CatalogueRemoteDataSource {
  CatalogueRemoteDataSource(this._client);
  final ApiClient _client;

  /// GET /tools with optional exact `category`, substring `search`,
  /// `page >= 1`, `limit 1–50`. Empty optionals are omitted.
  Future<Pagination<Tool>> getTools({
    String? category,
    String? search,
    int page = 1,
    int limit = 20,
  }) {
    final safePage = page < 1 ? 1 : page;
    final safeLimit = limit < 1 ? 1 : (limit > 50 ? 50 : limit);
    final cat = (category ?? '').trim();
    final q = (search ?? '').trim();
    return _client.get<Pagination<Tool>>(
      '/tools',
      query: {
        'category': cat.isEmpty ? null : cat,
        'search': q.isEmpty ? null : q,
        'page': safePage,
        'limit': safeLimit,
      },
      fromData: (data) => Pagination.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
        (item) => Tool.fromJson(
          item is Map<String, dynamic> ? item : <String, dynamic>{},
        ),
      ),
      auth: false,
    );
  }

  /// No GET /tools/:slug contract exists. Deep links resolve by searching
  /// the catalogue for an exact slug match.
  Future<Tool?> findBySlug(String slug) async {
    final page = await getTools(search: slug, page: 1, limit: 50);
    for (final tool in page.items) {
      if (tool.slug == slug) return tool;
    }
    return null;
  }
}
