import '../../../core/errors/api_exception.dart';
import '../../../core/models/models.dart';
import '../domain/favorite_repository.dart';
import 'favorite_remote_datasource.dart';

class FavoriteRepositoryImpl implements FavoriteRepository {
  FavoriteRepositoryImpl(this._remote);
  final FavoriteRemoteDataSource _remote;

  @override
  Future<List<Favorite>> getFavorites() => _remote.getFavorites();

  @override
  Future<Favorite> addFavorite(String toolId) => _remote.addFavorite(toolId);

  @override
  Future<void> removeFavorite(String toolId) async {
    try {
      await _remote.removeFavorite(toolId);
    } on ApiException catch (e) {
      // Delete is idempotent; a 404 just means already gone.
      if (e.statusCode == 404) return;
      rethrow;
    }
  }
}
