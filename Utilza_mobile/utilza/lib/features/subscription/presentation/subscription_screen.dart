import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/widgets/common.dart';
import 'subscription_providers.dart';

/// Read-only subscription. Purchasing is not implemented and no
/// checkout/cancel/refund UI is exposed.
class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sub = ref.watch(subscriptionProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(subscriptionProvider);
          await ref.read(subscriptionProvider.future);
        },
        child: sub.when(
          loading: () => const AppLoading(
            message: 'Loading subscription…',
          ),
          error: (e, _) => AppErrorView(
            message: e is ApiException
                ? ErrorMapper.userMessage(e)
                : 'Failed to load subscription.',
            onRetry: () => ref.invalidate(subscriptionProvider),
          ),
          data: (s) {
            if (s.isFree) {
              return const AppEmpty(
                message: 'You are currently on the free plan.',
              );
            }
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('Status: ${s.status}'),
                Text('Tier: ${s.tier}'),
                if (s.currentPeriodEnd != null)
                  Text('Renews: ${s.currentPeriodEnd!.toLocal()}'),
              ],
            );
          },
        ),
      ),
    );
  }
}
