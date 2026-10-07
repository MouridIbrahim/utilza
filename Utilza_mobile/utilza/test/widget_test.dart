import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/app/app.dart';
import 'package:utilza/core/models/models.dart';
import 'package:utilza/core/network/providers.dart';
import 'package:utilza/core/storage/secure_token_storage.dart';
import 'package:utilza/features/auth/data/auth_remote_datasource.dart';
import 'package:utilza/features/auth/data/auth_repository_impl.dart';
import 'package:utilza/features/catalogue/domain/catalogue_repository.dart';
import 'package:utilza/features/catalogue/presentation/catalogue_providers.dart';
import 'package:utilza/features/categories/domain/category_repository.dart';
import 'package:utilza/features/categories/presentation/category_providers.dart';

class _EmptyStorage extends SecureTokenStorage {
  @override
  Future<String?> readToken() async => null;
  @override
  Future<void> writeToken(String value) async {}
  @override
  Future<void> deleteToken() async {}
}

class _EmptyCategories implements CategoryRepository {
  @override
  Future<Category> getCategory(String slug) =>
      throw Exception('not found');
  @override
  Future<List<Category>> getCategories({bool forceRefresh = false}) async =>
      [];
}

class _EmptyCatalogue implements CatalogueRepository {
  @override
  Future<Tool?> findBySlug(String slug) async => null;
  @override
  Future<Pagination<Tool>> getTools({
    String? category,
    String? search,
    int page = 1,
    int limit = 20,
  }) async =>
      Pagination<Tool>(items: const [], page: 1, limit: 20, total: 0);
}

void main() {
  testWidgets('UtilzaApp boots to splash', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureTokenStorageProvider.overrideWithValue(_EmptyStorage()),
          categoryRepositoryProvider.overrideWithValue(_EmptyCategories()),
          catalogueRepositoryProvider.overrideWithValue(_EmptyCatalogue()),
        ],
        child: const UtilzaApp(),
      ),
    );
    // Splash shows indeterminate progress; don't pumpAndSettle.
    await tester.pump(const Duration(milliseconds: 100));
    final booted = find.text('Utilza').evaluate().isNotEmpty ||
        find.text('Home').evaluate().isNotEmpty ||
        find.textContaining('Starting').evaluate().isNotEmpty;
    expect(booted, isTrue);
    // Unused import guard: repository impl compiles into the graph.
    expect(AuthRepositoryImpl, isNotNull);
    expect(AuthRemoteDataSource, isNotNull);
  });
}
