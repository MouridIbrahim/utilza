import '../../../core/models/models.dart';

abstract class CategoryRepository {
  Future<List<Category>> getCategories({bool forceRefresh = false});
  Future<Category> getCategory(String slug);
}
