import '../../../core/models/models.dart';
import '../domain/category_repository.dart';
import 'category_remote_datasource.dart';

/// Caches the last category list for offline boundaries.
/// Backend returns active-only sorted by sortOrder; client re-sorts
/// and filters defensively.
class CategoryRepositoryImpl implements CategoryRepository {
  CategoryRepositoryImpl(this._remote);
  final CategoryRemoteDataSource _remote;

  List<Category>? _cache;

  @override
  Future<List<Category>> getCategories({bool forceRefresh = false}) async {
    if (!forceRefresh && _cache != null) return _cache!;
    try {
      final items = await _remote.getCategories();
      final active =
          items.where((c) => c.isActive).toList()
            ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
      _cache = active;
      return active;
    } catch (_) {
      if (_cache != null) return _cache!;
      rethrow;
    }
  }

  @override
  Future<Category> getCategory(String slug) async {
    // Prefer cache for instant detail when available.
    if (_cache != null) {
      for (final c in _cache!) {
        if (c.slug == slug) return c;
      }
    }
    return _remote.getCategory(slug);
  }

  void seedForTests(List<Category> items) => _cache = items;
}
