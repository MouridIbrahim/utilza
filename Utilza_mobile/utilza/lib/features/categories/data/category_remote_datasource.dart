import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';

class CategoryRemoteDataSource {
  CategoryRemoteDataSource(this._client);
  final ApiClient _client;

  Future<List<Category>> getCategories() {
    return _client.get<List<Category>>(
      '/categories',
      fromData: (data) {
        if (data is Map<String, dynamic>) {
          final items = data['items'];
          if (items is List) {
            return items
                .whereType<Map<String, dynamic>>()
                .map(Category.fromJson)
                .toList();
          }
        }
        if (data is List) {
          return data
              .whereType<Map<String, dynamic>>()
              .map(Category.fromJson)
              .toList();
        }
        return <Category>[];
      },
      auth: false,
    );
  }

  Future<Category> getCategory(String slug) {
    return _client.get<Category>(
      '/categories/$slug',
      fromData: (data) => Category.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
      auth: false,
    );
  }
}
