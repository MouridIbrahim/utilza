import '../../../core/models/models.dart';

abstract class CatalogueRepository {
  Future<Pagination<Tool>> getTools({
    String? category,
    String? search,
    int page,
    int limit,
  });

  Future<Tool?> findBySlug(String slug);
}
