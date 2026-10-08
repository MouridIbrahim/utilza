import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/presentation/auth_providers.dart';
import 'router.dart';
import 'theme.dart';
import 'theme_mode.dart';

/// Root widget: theme + single GoRouter refreshed on auth changes.
class UtilzaApp extends ConsumerStatefulWidget {
  const UtilzaApp({super.key});

  @override
  ConsumerState<UtilzaApp> createState() => _UtilzaAppState();
}

class _UtilzaAppState extends ConsumerState<UtilzaApp> {
  late final ValueNotifier<int> _refresh;
  late final GoRouter _router;

  bool _isAuthenticated() {
    try {
      return ref.read(authControllerProvider).isAuthenticated;
    } catch (_) {
      return false;
    }
  }

  @override
  void initState() {
    super.initState();
    _refresh = ValueNotifier(0);
    _router = buildRouter(
      isAuthenticated: _isAuthenticated,
      refresh: _refresh,
    );
  }

  @override
  void dispose() {
    _refresh.dispose();
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authControllerProvider, (prev, next) {
      _refresh.value++;
    });
    return MaterialApp.router(
      title: 'Utilza',
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ref.watch(themeModeControllerProvider),
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}
