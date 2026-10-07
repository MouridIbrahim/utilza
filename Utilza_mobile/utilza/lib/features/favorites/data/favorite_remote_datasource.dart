import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';

class FavoriteRemoteDataSource {
  FavoriteRemoteDataSource(this._client);
  final ApiClient _client;

  Future<List<Favorite>> getFavorites() {
    return _client.get<List<Favorite>>(
      '/favorites',
      fromData: (data) {
        if (data is Map<String, dynamic>) {
          final items = data['items'];
          if (items is List) {
            return items
                .whereType<Map<String, dynamic>>()
                .map(Favorite.fromJson)
                .toList();
          }
        }
        if (data is List) {
          return data
              .whereType<Map<String, dynamic>>()
              .map(Favorite.fromJson)
              .toList();
        }
        return <Favorite>[];
      },
    );
  }

  /// Uses the tool `id`, never the slug.
  Future<Favorite> addFavorite(String toolId) {
    return _client.post<Favorite>(
      '/favorites',
      body: {'toolId': toolId},
      fromData: (data) => Favorite.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
    );
  }

  /// Idempotent. Returns true when deleted.
  Future<bool> removeFavorite(String toolId) {
    return _client.delete<bool>(
      '/favorites/$toolId',
      fromData: (data) {
        if (data is Map<String, dynamic>) {
          return data['deleted'] == true;
        }
        return true;
      },
    );
  }
}
