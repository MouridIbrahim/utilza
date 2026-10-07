import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../core/widgets/common.dart';
import 'auth_providers.dart';

/// Bootstrap: secure storage → token? → GET /auth/me.
/// Authenticated or not, public home stays reachable.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(authControllerProvider.notifier).bootstrap(),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authControllerProvider, (_, next) {
      if (!mounted) return;
      switch (next.status) {
        case AuthStatus.authenticated:
        case AuthStatus.unauthenticated:
          context.go(AppRoutes.home);
          break;
        case AuthStatus.initializing:
          break;
        case AuthStatus.authError:
          break;
      }
    });

    final state = ref.watch(authControllerProvider);
    return Scaffold(
      body: Center(
        child: switch (state.status) {
          AuthStatus.authError => AppErrorView(
              message: state.errorMessage ?? 'Failed to start.',
              onRetry: () =>
                  ref.read(authControllerProvider.notifier).bootstrap(),
            ),
          _ => const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Utilza', style: TextStyle(fontSize: 32)),
                SizedBox(height: 16),
                AppLoading(message: 'Starting…'),
              ],
            ),
        },
      ),
    );
  }
}
