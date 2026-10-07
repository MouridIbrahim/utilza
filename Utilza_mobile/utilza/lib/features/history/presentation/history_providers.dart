import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/providers.dart';
import '../data/history_remote_datasource.dart';
import '../data/history_repository_impl.dart';
import '../domain/history_repository.dart';

final historyRepositoryProvider = Provider<HistoryRepository>((ref) {
  return HistoryRepositoryImpl(
    HistoryRemoteDataSource(ref.watch(apiClientProvider)),
  );
});

class HistoryState {
  const HistoryState({
    this.items = const [],
    this.page = 1,
    this.limit = 20,
    this.total = 0,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.errorMessage,
  });

  final List<ToolHistory> items;
  final int page;
  final int limit;
  final int total;
  final bool isLoading;
  final bool isLoadingMore;
  final String? errorMessage;

  bool get hasMore => items.length < total;
}

class HistoryController extends Notifier<HistoryState> {
  @override
  HistoryState build() => const HistoryState();

  Future<void> loadFirst() async {
    if (state.isLoading) return;
    state = const HistoryState(isLoading: true);
    try {
      final page = await ref.read(historyRepositoryProvider).getHistory(
            page: 1,
            limit: state.limit,
          );
      state = HistoryState(
        items: page.items,
        page: page.page,
        limit: page.limit,
        total: page.total,
      );
    } catch (e) {
      state = HistoryState(errorMessage: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;
    state = HistoryState(
      items: state.items,
      page: state.page,
      limit: state.limit,
      total: state.total,
      isLoadingMore: true,
    );
    try {
      final page = await ref.read(historyRepositoryProvider).getHistory(
            page: state.page + 1,
            limit: state.limit,
          );
      final seen = state.items.map((h) => h.id).toSet();
      state = HistoryState(
        items: [
          ...state.items,
          for (final h in page.items)
            if (seen.add(h.id)) h,
        ],
        page: page.page,
        limit: page.limit,
        total: page.total,
      );
    } catch (e) {
      state = HistoryState(
        items: state.items,
        page: state.page,
        limit: state.limit,
        total: state.total,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> refresh() => loadFirst();

  Future<void> clear() async {
    await ref.read(historyRepositoryProvider).clear();
    state = const HistoryState();
    await loadFirst();
  }

  /// Fire-and-forget record for tool executors (Phase 8).
  /// Callers must ensure the user is authenticated.
  Future<void> record(String toolSlug, {String? inputSummary}) async {
    try {
      await ref.read(historyRepositoryProvider).record(
            toolSlug: toolSlug,
            inputSummary: inputSummary,
          );
    } catch (_) {
      // History must never break tool execution.
    }
  }

  void clearLocal() => state = const HistoryState();
}

final historyControllerProvider =
    NotifierProvider<HistoryController, HistoryState>(HistoryController.new);
