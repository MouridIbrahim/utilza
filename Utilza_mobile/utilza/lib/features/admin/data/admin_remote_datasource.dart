import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../domain/admin_models.dart';

/// Read-only admin listing. No mutations exist: category writes return
/// 501 NOT_IMPLEMENTED and user mutations are not exposed.
class AdminRemoteDataSource {
  AdminRemoteDataSource(this._client);
  final ApiClient _client;

  Future<Pagination<AdminTool>> getTools({
    int page = 1,
    int limit = 20,
    String? search,
  }) {
    final safePage = page < 1 ? 1 : page;
    final safeLimit = limit < 1 ? 1 : (limit > 100 ? 100 : limit);
    final q = (search ?? '').trim();
    return _client.get<Pagination<AdminTool>>(
      '/admin/tools',
      query: {
        'page': safePage,
        'limit': safeLimit,
        if (q.isNotEmpty) 'search': q,
      },
      fromData: (data) => Pagination.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
        (item) => AdminTool.fromJson(
          item is Map<String, dynamic> ? item : <String, dynamic>{},
        ),
      ),
    );
  }

  Future<Pagination<AdminUser>> getUsers({
    int page = 1,
    int limit = 20,
    String? search,
  }) {
    final safePage = page < 1 ? 1 : page;
    final safeLimit = limit < 1 ? 1 : (limit > 100 ? 100 : limit);
    final q = (search ?? '').trim();
    return _client.get<Pagination<AdminUser>>(
      '/admin/users',
      query: {
        'page': safePage,
        'limit': safeLimit,
        if (q.isNotEmpty) 'search': q,
      },
      fromData: (data) => Pagination.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
        (item) => AdminUser.fromJson(
          item is Map<String, dynamic> ? item : <String, dynamic>{},
        ),
      ),
    );
  }
}
