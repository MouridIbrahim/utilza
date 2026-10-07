import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/models/models.dart';
import '../../../core/network/providers.dart';
import '../data/auth_remote_datasource.dart';
import '../data/auth_repository_impl.dart';
import '../domain/auth_repository.dart';

/// Auth states mirroring spec §40.
enum AuthStatus { initializing, unauthenticated, authenticated, authError }

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.isLoading = false,
    this.errorMessage,
  });

  final AuthStatus status;
  final PublicUser? user;
  final bool isLoading;
  final String? errorMessage;

  bool get isAuthenticated => status == AuthStatus.authenticated;

  AuthState copyWith({
    AuthStatus? status,
    PublicUser? user,
    bool? isLoading,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }

  AuthState clearUser() {
    return AuthState(
      status: status,
      isLoading: isLoading,
      errorMessage: errorMessage,
    );
  }
}

final authRemoteDataSourceProvider =
    Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSource(ref.watch(apiClientProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    ref.watch(authRemoteDataSourceProvider),
    ref.watch(secureTokenStorageProvider),
  );
});

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() =>
      const AuthState(status: AuthStatus.unauthenticated);

  /// Compatibility hook for the 401 interceptor (Phase 2 wiring).
  void setStatus(AuthStatus status) {
    if (status == AuthStatus.unauthenticated) {
      state = const AuthState(status: AuthStatus.unauthenticated);
    } else {
      state = state.copyWith(status: status);
    }
  }

  /// Splash bootstrap: token? → GET /auth/me → authenticated,
  /// 401 → delete token → unauthenticated.
  Future<void> bootstrap() async {
    state = state.copyWith(status: AuthStatus.initializing, isLoading: true);
    final storage = ref.read(secureTokenStorageProvider);
    final repo = ref.read(authRepositoryProvider);
    final token = await storage.readToken();
    if (token == null || token.isEmpty) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }
    try {
      final user = await repo.getMe();
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } on ApiException catch (e) {
      if (e.isUnauthorized) {
        await storage.deleteToken();
        state = const AuthState(status: AuthStatus.unauthenticated);
      } else {
        state = AuthState(
          status: AuthStatus.authError,
          errorMessage: e.message,
        );
      }
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final result =
          await ref.read(authRepositoryProvider).login(
                email: email,
                password: password,
              );
      state = AuthState(status: AuthStatus.authenticated, user: result.user);
    } on ApiException catch (e) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: e.message,
      );
      rethrow;
    } finally {
      if (!state.isAuthenticated) {
        state = state.copyWith(isLoading: false);
      }
    }
  }

  Future<void> register({
    required String email,
    required String password,
    String? name,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final result =
          await ref.read(authRepositoryProvider).register(
                email: email,
                password: password,
                name: name,
              );
      state = AuthState(status: AuthStatus.authenticated, user: result.user);
    } on ApiException catch (e) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: e.message,
      );
      rethrow;
    } finally {
      if (!state.isAuthenticated) {
        state = state.copyWith(isLoading: false);
      }
    }
  }

  /// Always clears local state even if POST /auth/logout fails
  /// (repository guarantees token deletion).
  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    try {
      await ref.read(authRepositoryProvider).logout();
    } finally {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);
