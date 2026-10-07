import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/providers.dart';
import '../../analytics/data/analytics_remote_datasource.dart';
import '../data/catalogue_remote_datasource.dart';
import '../data/catalogue_repository_impl.dart';
import '../domain/catalogue_repository.dart';

final catalogueRepositoryProvider = Provider<CatalogueRepository>((ref) {
  final remote =
      CatalogueRemoteDataSource(ref.watch(apiClientProvider));
  return CatalogueRepositoryImpl(remote);
});

final analyticsProvider = Provider<AnalyticsRemoteDataSource>((ref) {
  return AnalyticsRemoteDataSource(ref.watch(apiClientProvider));
});

class ToolsState {
  const ToolsState({
    this.items = const [],
    this.page = 1,
    this.limit = 20,
    this.total = 0,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.errorMessage,
    this.category,
    this.search,
  });

  final List<Tool> items;
  final int page;
  final int limit;
  final int total;
  final bool isLoading;
  final bool isLoadingMore;
  final String? errorMessage;
  final String? category;
  final String? search;

  bool get hasMore => items.length < total;
  bool get isEmpty => !isLoading && items.isEmpty && errorMessage == null;

  ToolsState copyWith({
    List<Tool>? items,
    int? page,
    int? limit,
    int? total,
    bool? isLoading,
    bool? isLoadingMore,
    String? errorMessage,
    String? Function()? category,
    String? Function()? search,
  }) {
    return ToolsState(
      items: items ?? this.items,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      total: total ?? this.total,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      errorMessage: errorMessage,
      category: category != null ? category() : this.category,
      search: search != null ? search() : this.search,
    );
  }
}

/// Paginated tools with filter reset, dedupe, and item preservation.
/// No cursor pagination exists; offset `page/limit` only.
class ToolsController extends Notifier<ToolsState> {
  @override
  ToolsState build() => const ToolsState();

  Future<void> loadFirst({String? category, String? search}) async {
    if (state.isLoading) return; // prevent duplicate page requests
    state = ToolsState(
      isLoading: true,
      category: _norm(category),
      search: _norm(search),
      limit: state.limit,
    );
    try {
      final page = await ref.read(catalogueRepositoryProvider).getTools(
            category: state.category,
            search: state.search,
            page: 1,
            limit: state.limit,
          );
      state = state.copyWith(
        items: page.items,
        page: page.page,
        limit: page.limit,
        total: page.total,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;
    state = state.copyWith(isLoadingMore: true, errorMessage: null);
    try {
      final next = state.page + 1;
      final page = await ref.read(catalogueRepositoryProvider).getTools(
            category: state.category,
            search: state.search,
            page: next,
            limit: state.limit,
          );
      final seen = state.items.map((t) => t.id).toSet();
      final merged = [
        ...state.items,
        for (final t in page.items)
          if (seen.add(t.id)) t,
      ];
      state = state.copyWith(
        items: merged,
        page: page.page,
        limit: page.limit,
        total: page.total,
        isLoadingMore: false,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, errorMessage: e.toString());
    }
  }

  Future<void> refresh() {
    return loadFirst(category: state.category, search: state.search);
  }

  String? _norm(String? v) {
    final t = (v ?? '').trim();
    return t.isEmpty ? null : t;
  }
}

final toolsControllerProvider =
    NotifierProvider<ToolsController, ToolsState>(ToolsController.new);

/// Deep-link resolution: no GET /tools/:slug exists, so search for an
/// exact slug match. List navigation should pass the Tool via extra
/// to avoid this fetch.
final toolBySlugProvider =
    FutureProvider.family<Tool?, String>((ref, slug) {
  return ref.watch(catalogueRepositoryProvider).findBySlug(slug);
});
