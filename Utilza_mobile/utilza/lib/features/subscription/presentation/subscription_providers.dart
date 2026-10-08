import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/providers.dart';
import '../data/subscription_remote_datasource.dart';
import '../data/subscription_repository_impl.dart';
import '../domain/subscription_repository.dart';

final subscriptionRepositoryProvider =
    Provider<SubscriptionRepository>((ref) {
  return SubscriptionRepositoryImpl(
    SubscriptionRemoteDataSource(ref.watch(apiClientProvider)),
  );
});

/// Read-only subscription. No checkout/cancel/refund UI exists.
final subscriptionProvider = FutureProvider<Subscription>((ref) {
  return ref.watch(subscriptionRepositoryProvider).getMySubscription();
});
