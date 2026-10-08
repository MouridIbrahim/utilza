import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/models.dart';
import '../../core/widgets/common.dart';
import '../../features/admin/presentation/admin_tools_screen.dart';
import '../../features/admin/presentation/admin_users_screen.dart';
import '../../features/tools/domain/backend_tool_configs.dart';
import '../../features/tools/domain/url_tool_config.dart';
import '../../features/tools/presentation/backend_executor_screen.dart';
import '../../features/tools/presentation/url_executor_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/catalogue/presentation/home_screen.dart';
import '../../features/catalogue/presentation/search_screen.dart';
import '../../features/categories/presentation/category_screen.dart';
import '../../features/favorites/presentation/favorites_screen.dart';
import '../../features/history/presentation/history_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/subscription/presentation/subscription_screen.dart';
import '../../features/tools/presentation/local_executor_screen.dart';
import '../../features/tools/presentation/tool_detail_screen.dart';
import 'shell.dart';

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
  static const localExecutor = '/tool/:slug/local';
  static const backendExecutor = '/tool/:slug/run';

  static String categoryWith(String slug) => '/category/$slug';
  static String toolWith(String slug) => '/tool/$slug';
  static String localWith(String slug) => '/tool/$slug/local';
  static String runWith(String slug) => '/tool/$slug/run';
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
      StatefulShellRoute.indexedStack(
        builder: (c, s, shell) => MainShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.home,
                builder: (c, s) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.search,
                builder: (c, s) => const SearchScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.favorites,
                builder: (c, s) => const FavoritesScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.history,
                builder: (c, s) => const HistoryScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.profile,
                builder: (c, s) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/category/:slug',
        builder: (c, s) => CategoryScreen(
          slug: s.pathParameters['slug'] ?? '',
        ),
      ),
      GoRoute(
        path: '/tool/:slug/local',
        builder: (c, s) {
          final extra = s.extra;
          return LocalExecutorScreen(
            slug: s.pathParameters['slug'] ?? '',
            initial: extra is Tool ? extra : null,
          );
        },
      ),
      GoRoute(
        path: '/tool/:slug/run',
        builder: (c, s) {
          final extra = s.extra;
          final slug = s.pathParameters['slug'] ?? '';
          final tool = extra is Tool ? extra : null;
          if (tool == null) {
            return const PlaceholderScreen(
              title: 'Online tool',
              detail: 'Tool unavailable.',
            );
          }
          final config = BackendToolConfigs.lookup(slug);
          if (config != null) {
            return BackendExecutorScreen(tool: tool, config: config);
          }
          final urlConfig = UrlToolConfigs.lookup(slug);
          if (urlConfig != null) {
            return UrlExecutorScreen(tool: tool, config: urlConfig);
          }
          return const PlaceholderScreen(
            title: 'Online tool',
            detail: 'BACKEND CONTRACT MISSING for this tool.',
          );
        },
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
        builder: (c, s) => const ProfileScreen(),
      ),
      GoRoute(
        path: AppRoutes.favorites,
        builder: (c, s) => const FavoritesScreen(),
      ),
      GoRoute(
        path: AppRoutes.history,
        builder: (c, s) => const HistoryScreen(),
      ),
      GoRoute(
        path: AppRoutes.subscription,
        builder: (c, s) => const SubscriptionScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminTools,
        builder: (c, s) => const AdminToolsScreen(),
      ),
      GoRoute(
        path: AppRoutes.adminUsers,
        builder: (c, s) => const AdminUsersScreen(),
      ),
    ],
    errorBuilder: (c, s) => Scaffold(
      appBar: AppBar(title: const Text('Not found')),
      body: Center(child: Text(s.error?.toString() ?? 'Route not found')),
    ),
  );
}
