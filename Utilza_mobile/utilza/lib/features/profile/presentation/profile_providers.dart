import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/providers.dart';
import '../../auth/presentation/auth_providers.dart';
import '../../favorites/presentation/favorite_providers.dart';
import '../../history/presentation/history_providers.dart';
import '../data/profile_remote_datasource.dart';
import '../data/profile_repository_impl.dart';
import '../domain/profile_repository.dart';
import '../../subscription/presentation/subscription_providers.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepositoryImpl(
    ProfileRemoteDataSource(ref.watch(apiClientProvider)),
  );
});

final profileProvider = FutureProvider<PublicUser>((ref) {
  return ref.watch(profileRepositoryProvider).getProfile();
});

/// Deletes the account, then clears local auth + user caches and
/// returns to the public state. There is no undo (cascades
/// favorites/history/subscription on the server).
Future<void> deleteAccountAndClear(WidgetRef ref) async {
  await ref.read(profileRepositoryProvider).deleteAccount();
  await ref.read(secureTokenStorageProvider).deleteToken();
  ref.read(authControllerProvider.notifier).setStatus(
        AuthStatus.unauthenticated,
      );
  ref
    ..invalidate(profileProvider)
    ..invalidate(favoritesControllerProvider)
    ..invalidate(historyControllerProvider)
    ..invalidate(subscriptionProvider);
}
