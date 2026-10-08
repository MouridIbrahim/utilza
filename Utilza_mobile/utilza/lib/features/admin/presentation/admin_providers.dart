import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/network/providers.dart';
import '../../auth/presentation/auth_providers.dart';
import '../data/admin_remote_datasource.dart';
import '../domain/admin_models.dart';

final adminRemoteDataSourceProvider =
    Provider<AdminRemoteDataSource>((ref) {
  return AdminRemoteDataSource(ref.watch(apiClientProvider));
});

class AdminToolsState {
  const AdminToolsState({
    this.items = const [],
    this.page = 1,
    this.limit = 20,
    this.total = 0,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.errorMessage,
    this.accessDenied = false,
    this.search,
  });

  final List<AdminTool> items;
  final int page;
  final int limit;
  final int total;
  final bool isLoading;
  final bool isLoadingMore;
  final String? errorMessage;

  /// True on 403 FORBIDDEN: the backend decided, never a local role.
  final bool accessDenied;
  final String? search;

  bool get hasMore => items.length < total;
}

class AdminToolsController extends Notifier<AdminToolsState> {
  @override
  AdminToolsState build() => const AdminToolsState();

  Future<void> loadFirst({String? search}) async {
    if (state.isLoading) return;
    final q = (search ?? '').trim();
    state = AdminToolsState(
      isLoading: true,
      search: q.isEmpty ? null : q,
      limit: state.limit,
    );
    try {
      final page = await ref
          .read(adminRemoteDataSourceProvider)
          .getTools(search: state.search, page: 1, limit: state.limit);
      state = AdminToolsState(
        items: page.items,
        page: page.page,
        limit: page.limit,
        total: page.total,
        search: state.search,
      );
    } on ApiException catch (e) {
      if (e.statusCode == 403 || e.code == 'FORBIDDEN') {
        state = const AdminToolsState(accessDenied: true);
      } else {
        state = AdminToolsState(errorMessage: e.message);
      }
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;
    state = AdminToolsState(
      items: state.items,
      page: state.page,
      limit: state.limit,
      total: state.total,
      search: state.search,
      isLoadingMore: true,
    );
    try {
      final page = await ref
          .read(adminRemoteDataSourceProvider)
          .getTools(
            search: state.search,
            page: state.page + 1,
            limit: state.limit,
          );
      final seen = state.items.map((t) => t.id).toSet();
      state = AdminToolsState(
        items: [
          ...state.items,
          for (final t in page.items)
            if (seen.add(t.id)) t,
        ],
        page: page.page,
        limit: page.limit,
        total: page.total,
        search: state.search,
      );
    } on ApiException catch (e) {
      state = AdminToolsState(
        items: state.items,
        page: state.page,
        limit: state.limit,
        total: state.total,
        search: state.search,
        errorMessage: e.message,
      );
    }
  }

  Future<void> refresh() => loadFirst(search: state.search);
}

final adminToolsControllerProvider =
    NotifierProvider<AdminToolsController, AdminToolsState>(
        AdminToolsController.new);

class AdminUsersState {
  const AdminUsersState({
    this.items = const [],
    this.page = 1,
    this.limit = 20,
    this.total = 0,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.errorMessage,
    this.accessDenied = false,
    this.search,
  });

  final List<AdminUser> items;
  final int page;
  final int limit;
  final int total;
  final bool isLoading;
  final bool isLoadingMore;
  final String? errorMessage;

  /// True on 403 FORBIDDEN: the backend decided, never a local role.
  final bool accessDenied;
  final String? search;

  bool get hasMore => items.length < total;
}

class AdminUsersController extends Notifier<AdminUsersState> {
  @override
  AdminUsersState build() => const AdminUsersState();

  Future<void> loadFirst({String? search}) async {
    if (state.isLoading) return;
    final q = (search ?? '').trim();
    state = AdminUsersState(
      isLoading: true,
      search: q.isEmpty ? null : q,
      limit: state.limit,
    );
    try {
      final page = await ref
          .read(adminRemoteDataSourceProvider)
          .getUsers(search: state.search, page: 1, limit: state.limit);
      state = AdminUsersState(
        items: page.items,
        page: page.page,
        limit: page.limit,
        total: page.total,
        search: state.search,
      );
    } on ApiException catch (e) {
      if (e.statusCode == 403 || e.code == 'FORBIDDEN') {
        state = const AdminUsersState(accessDenied: true);
      } else {
        state = AdminUsersState(errorMessage: e.message);
      }
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;
    state = AdminUsersState(
      items: state.items,
      page: state.page,
      limit: state.limit,
      total: state.total,
      search: state.search,
      isLoadingMore: true,
    );
    try {
      final page = await ref
          .read(adminRemoteDataSourceProvider)
          .getUsers(
            search: state.search,
            page: state.page + 1,
            limit: state.limit,
          );
      final seen = state.items.map((u) => u.id).toSet();
      state = AdminUsersState(
        items: [
          ...state.items,
          for (final u in page.items)
            if (seen.add(u.id)) u,
        ],
        page: page.page,
        limit: page.limit,
        total: page.total,
        search: state.search,
      );
    } on ApiException catch (e) {
      state = AdminUsersState(
        items: state.items,
        page: state.page,
        limit: state.limit,
        total: state.total,
        search: state.search,
        errorMessage: e.message,
      );
    }
  }

  Future<void> refresh() => loadFirst(search: state.search);
}

final adminUsersControllerProvider =
    NotifierProvider<AdminUsersController, AdminUsersState>(
        AdminUsersController.new);

/// True when the signed-in user passes the backend admin gate.
/// The backend decides (ADMIN_EMAILS allowlist): probe the cheapest admin
/// endpoint and treat 403 as "not admin". Never a local role flag.
final isAdminProvider = FutureProvider<bool>((ref) async {
  final authed = ref.watch(
    authControllerProvider.select((s) => s.isAuthenticated),
  );
  if (!authed) return false;
  try {
    await ref
        .watch(adminRemoteDataSourceProvider)
        .getTools(page: 1, limit: 1);
    return true;
  } on ApiException catch (e) {
    if (e.statusCode == 403 || e.code == 'FORBIDDEN') return false;
    return false;
  }
});
