import '../../../core/models/models.dart';

abstract class FavoriteRepository {
  Future<List<Favorite>> getFavorites();
  Future<Favorite> addFavorite(String toolId);
  Future<void> removeFavorite(String toolId);
}
