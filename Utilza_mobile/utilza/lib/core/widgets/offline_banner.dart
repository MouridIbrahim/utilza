import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Connectivity stream. Offline is valid only for cached catalogue data,
/// `supportsOffline` tools, and purely local frontend tools — backend
/// transforms and authenticated server state need connectivity.
final connectivityProvider =
    StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

/// True when there is no usable network.
final isOfflineProvider = Provider<bool>((ref) {
  final async = ref.watch(connectivityProvider);
  return async.maybeWhen(
    data: (results) =>
        results.isEmpty || results.every((r) => r == ConnectivityResult.none),
    orElse: () => false,
  );
});

/// Offline notice. Never pretends a backend transform can work offline.
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offline = ref.watch(isOfflineProvider);
    if (!offline) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: Theme.of(context).colorScheme.errorContainer,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: const Text(
        'You are offline. Online tools and account data need connectivity.',
        textAlign: TextAlign.center,
      ),
    );
  }
}
