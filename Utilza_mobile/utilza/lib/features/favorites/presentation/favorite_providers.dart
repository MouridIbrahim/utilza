import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/models/models.dart';
import '../../../core/network/providers.dart';
import '../data/favorite_remote_datasource.dart';
import '../data/favorite_repository_impl.dart';
import '../domain/favorite_repository.dart';

final favoriteRepositoryProvider = Provider<FavoriteRepository>((ref) {
  return FavoriteRepositoryImpl(
    FavoriteRemoteDataSource(ref.watch(apiClientProvider)),
  );
});

class FavoritesState {
  const FavoritesState({
    this.items = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  final List<Favorite> items;
  final bool isLoading;
  final String? errorMessage;

  bool isFavorite(String toolId) =>
      items.any((f) => f.toolId == toolId);
}

class FavoritesController extends Notifier<FavoritesState> {
  @override
  FavoritesState build() => const FavoritesState();

  Future<void> load() async {
    if (state.isLoading) return;
    state = const FavoritesState(isLoading: true);
    try {
      final items = await ref.read(favoriteRepositoryProvider).getFavorites();
      state = FavoritesState(items: items);
    } catch (e) {
      state = FavoritesState(errorMessage: e.toString());
    }
  }

  Future<void> refresh() => load();

  /// Toggles by tool id. 409 ALREADY_FAVORITED reconciles to a reload.
  Future<void> toggle(String toolId) async {
    if (state.isFavorite(toolId)) {
      await remove(toolId);
      return;
    }
    try {
      await ref.read(favoriteRepositoryProvider).addFavorite(toolId);
    } on ApiException catch (e) {
      if (e.code != 'ALREADY_FAVORITED') rethrow;
    }
    await load();
  }

  Future<void> remove(String toolId) async {
    await ref.read(favoriteRepositoryProvider).removeFavorite(toolId);
    await load();
  }

  void clear() => state = const FavoritesState();
}

final favoritesControllerProvider =
    NotifierProvider<FavoritesController, FavoritesState>(
        FavoritesController.new);
