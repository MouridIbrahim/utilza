import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/providers.dart';
import '../data/category_remote_datasource.dart';
import '../data/category_repository_impl.dart';
import '../domain/category_repository.dart';

final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  final remote =
      CategoryRemoteDataSource(ref.watch(apiClientProvider));
  return CategoryRepositoryImpl(remote);
});

final categoriesProvider = FutureProvider<List<Category>>((ref) {
  return ref.watch(categoryRepositoryProvider).getCategories();
});

final categoryDetailProvider =
    FutureProvider.family<Category, String>((ref, slug) {
  return ref.watch(categoryRepositoryProvider).getCategory(slug);
});
