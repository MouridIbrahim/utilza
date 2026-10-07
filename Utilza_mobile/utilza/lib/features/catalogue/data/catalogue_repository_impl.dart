import '../../../core/models/models.dart';
import '../domain/catalogue_repository.dart';
import 'catalogue_remote_datasource.dart';

class CatalogueRepositoryImpl implements CatalogueRepository {
  CatalogueRepositoryImpl(this._remote);
  final CatalogueRemoteDataSource _remote;

  @override
  Future<Pagination<Tool>> getTools({
    String? category,
    String? search,
    int page = 1,
    int limit = 20,
  }) {
    return _remote.getTools(
      category: category,
      search: search,
      page: page,
      limit: limit,
    );
  }

  @override
  Future<Tool?> findBySlug(String slug) => _remote.findBySlug(slug);
}
