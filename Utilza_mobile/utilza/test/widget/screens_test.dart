import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/app/router.dart';
import 'package:utilza/core/models/models.dart';
import 'package:utilza/core/network/providers.dart';
import 'package:utilza/core/storage/secure_token_storage.dart';
import 'package:utilza/core/widgets/offline_banner.dart';
import 'package:utilza/features/auth/presentation/login_screen.dart';
import 'package:utilza/features/catalogue/domain/catalogue_repository.dart';
import 'package:utilza/features/catalogue/presentation/catalogue_providers.dart';
import 'package:utilza/features/categories/domain/category_repository.dart';
import 'package:utilza/features/categories/presentation/category_providers.dart';
import 'package:utilza/features/favorites/domain/favorite_repository.dart';
import 'package:utilza/features/favorites/presentation/favorite_providers.dart';
import 'package:utilza/features/favorites/presentation/favorites_screen.dart';
import 'package:utilza/features/history/domain/history_repository.dart';
import 'package:utilza/features/history/presentation/history_providers.dart';
import 'package:utilza/features/history/presentation/history_screen.dart';
import 'package:utilza/features/subscription/domain/subscription_repository.dart';
import 'package:utilza/features/subscription/presentation/subscription_providers.dart';
import 'package:utilza/features/subscription/presentation/subscription_screen.dart';
import 'package:utilza/features/tools/domain/backend_tool_configs.dart';
import 'package:utilza/features/tools/domain/url_tool_config.dart';
import 'package:utilza/features/tools/presentation/backend_executor_screen.dart';
import 'package:utilza/features/tools/presentation/url_executor_screen.dart';

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

class _FakeFavorites implements FavoriteRepository {
  _FakeFavorites({this.hang = false});
  final List<Favorite> items = [];
  final bool hang;

  @override
  Future<Favorite> addFavorite(String toolId) async =>
      throw UnimplementedError();
  @override
  Future<List<Favorite>> getFavorites() async {
    if (hang) await Completer<void>().future;
    return items;
  }

  @override
  Future<void> removeFavorite(String toolId) async {}
}

class _FakeHistory implements HistoryRepository {
  @override
  Future<Pagination<ToolHistory>> getHistory(
          {int page = 1, int limit = 20}) async =>
      Pagination<ToolHistory>(
          items: const [], page: 1, limit: 20, total: 0);
  @override
  Future<ToolHistory> record(
          {required String toolSlug, String? inputSummary}) async =>
      throw UnimplementedError();
  @override
  Future<void> clear() async {}
}

class _FreeSubscription implements SubscriptionRepository {
  @override
  Future<Subscription> getMySubscription() async =>
      Subscription.free();
}

Tool _backendTool(String slug) => Tool.fromJson({
      'id': 't-$slug',
      'name': 'Tool $slug',
      'slug': slug,
      'description': 'Online test tool.',
      'implementation': 'backend',
    });

void main() {
  group('empty states', () {
    testWidgets('favorites shows the spec empty message', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            favoriteRepositoryProvider
                .overrideWithValue(_FakeFavorites()),
          ],
          child: const MaterialApp(home: FavoritesScreen()),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('No favorite tools yet.'), findsOneWidget);
    });

    testWidgets('history shows the spec empty message', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            historyRepositoryProvider.overrideWithValue(_FakeHistory()),
          ],
          child: const MaterialApp(home: HistoryScreen()),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('No recent tools.'), findsOneWidget);
    });

    testWidgets('free subscription shows the free-plan message',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            subscriptionRepositoryProvider
                .overrideWithValue(_FreeSubscription()),
          ],
          child: const MaterialApp(home: SubscriptionScreen()),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(
        find.text('You are currently on the free plan.'),
        findsOneWidget,
      );
    });
  });

  group('loading states', () {
    testWidgets('favorites shows loading while fetching', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            favoriteRepositoryProvider.overrideWithValue(
              _FakeFavorites(hang: true),
            ),
          ],
          child: const MaterialApp(home: FavoritesScreen()),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.text('Loading favorites…'), findsOneWidget);
    });
  });

  group('validation states', () {
    testWidgets('login rejects empty input client-side', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: LoginScreen()),
        ),
      );
      await tester.pump();
      await tester.tap(find.widgetWithText(FilledButton, 'Login'));
      await tester.pump();
      expect(find.text('Email is required.'), findsOneWidget);
      expect(find.text('Password is required.'), findsOneWidget);
    });

    testWidgets('backend executor requires files before upload',
        (tester) async {
      final tool = _backendTool('pdf-merge');
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: BackendExecutorScreen(
              tool: tool,
              config: BackendToolConfigs.lookup('pdf-merge')!,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.tap(find.widgetWithText(FilledButton, 'Run'));
      await tester.pump();
      expect(
        find.text('Please select at least 2 file(s).'),
        findsOneWidget,
      );
    });

    testWidgets('URL executor requires input', (tester) async {
      final tool = _backendTool('url-status');
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: UrlExecutorScreen(
              tool: tool,
              config: UrlToolConfigs.lookup('url-status')!,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.tap(find.widgetWithText(FilledButton, 'Run'));
      await tester.pump();
      expect(find.text('URL is required.'), findsOneWidget);
    });
  });

  group('auth guards', () {
    testWidgets('guarded routes redirect to login when unauthenticated',
        (tester) async {
      final router = buildRouter(isAuthenticated: () => false);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            secureTokenStorageProvider.overrideWithValue(_EmptyStorage()),
            categoryRepositoryProvider
                .overrideWithValue(_EmptyCategories()),
            catalogueRepositoryProvider
                .overrideWithValue(_EmptyCatalogue()),
          ],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      router.go('/profile');
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('No account? Register'), findsOneWidget);
    });
  });

  group('offline boundaries', () {
    testWidgets('banner shows offline, hides online', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          key: UniqueKey(),
          overrides: [
            connectivityProvider.overrideWith(
              (ref) => Stream.value([ConnectivityResult.none]),
            ),
          ],
          child: const MaterialApp(
            home: Scaffold(body: OfflineBanner()),
          ),
        ),
      );
      await tester.pump();
      expect(find.textContaining('offline'), findsOneWidget);

      await tester.pumpWidget(
        ProviderScope(
          key: UniqueKey(),
          overrides: [
            connectivityProvider.overrideWith(
              (ref) => Stream.value([ConnectivityResult.wifi]),
            ),
          ],
          child: const MaterialApp(
            home: Scaffold(body: OfflineBanner()),
          ),
        ),
      );
      await tester.pump();
      expect(find.textContaining('offline'), findsNothing);
    });
  });
}
