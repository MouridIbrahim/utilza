import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/models.dart';
import '../../core/widgets/common.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/catalogue/presentation/home_screen.dart';
import '../../features/catalogue/presentation/search_screen.dart';
import '../../features/categories/presentation/category_screen.dart';
import '../../features/tools/presentation/tool_detail_screen.dart';

/// Route names/paths. Public routes stay reachable without auth;
/// guarded routes redirect to /login when unauthenticated.
abstract final class AppRoutes {
  static const splash = '/splash';
  static const home = '/';
  static const category = '/category/:slug';
  static const search = '/search';
  static const toolDetail = '/tool/:slug';
  static const login = '/login';
  static const register = '/register';
  static const profile = '/profile';
  static const favorites = '/favorites';
  static const history = '/history';
  static const subscription = '/subscription';
  static const adminTools = '/admin/tools';
  static const adminUsers = '/admin/users';

  static String categoryWith(String slug) => '/category/$slug';
  static String toolWith(String slug) => '/tool/$slug';
}

GoRouter buildRouter({
  required bool Function() isAuthenticated,
  Listenable? refresh,
}) {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: refresh,
    redirect: (context, state) {
      const guarded = {
        AppRoutes.profile,
        AppRoutes.favorites,
        AppRoutes.history,
        AppRoutes.subscription,
      };
      final loc = state.matchedLocation;
      final authed = isAuthenticated();
      if (guarded.contains(loc) && !authed) return AppRoutes.login;
      if ((loc == AppRoutes.login || loc == AppRoutes.register) && authed) {
        return AppRoutes.home;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (c, s) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (c, s) => const HomeScreen(),
      ),
      GoRoute(
        path: '/category/:slug',
        builder: (c, s) => CategoryScreen(
          slug: s.pathParameters['slug'] ?? '',
        ),
      ),
      GoRoute(
        path: AppRoutes.search,
        builder: (c, s) => const SearchScreen(),
      ),
      GoRoute(
        path: '/tool/:slug',
        builder: (c, s) {
          final extra = s.extra;
          return ToolDetailScreen(
            slug: s.pathParameters['slug'] ?? '',
            initial: extra is Tool ? extra : null,
          );
        },
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (c, s) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (c, s) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.profile,
        builder: (c, s) => const PlaceholderScreen(
          title: 'Profile',
          detail: 'Profile — Phase 6.',
        ),
      ),
      GoRoute(
        path: AppRoutes.favorites,
        builder: (c, s) => const PlaceholderScreen(
          title: 'Favorites',
          detail: 'Favorites — Phase 6.',
        ),
      ),
      GoRoute(
        path: AppRoutes.history,
        builder: (c, s) => const PlaceholderScreen(
          title: 'History',
          detail: 'History — Phase 6.',
        ),
      ),
      GoRoute(
        path: AppRoutes.subscription,
        builder: (c, s) => const PlaceholderScreen(
          title: 'Subscription',
          detail: 'Subscription (read-only) — Phase 6.',
        ),
      ),
      GoRoute(
        path: AppRoutes.adminTools,
        builder: (c, s) => const PlaceholderScreen(
          title: 'Admin tools',
          detail: 'Optional read-only admin — Phase 12.',
        ),
      ),
      GoRoute(
        path: AppRoutes.adminUsers,
        builder: (c, s) => const PlaceholderScreen(
          title: 'Admin users',
          detail: 'Optional read-only admin — Phase 12.',
        ),
      ),
    ],
    errorBuilder: (c, s) => Scaffold(
      appBar: AppBar(title: const Text('Not found')),
      body: Center(child: Text(s.error?.toString() ?? 'Route not found')),
    ),
  );
}
