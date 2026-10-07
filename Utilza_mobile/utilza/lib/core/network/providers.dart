import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/auth_providers.dart';
import '../constants/api_constants.dart';
import '../storage/secure_token_storage.dart';
import 'api_client.dart';

final secureTokenStorageProvider = Provider<SecureTokenStorage>((ref) {
  return SecureTokenStorage();
});

/// Central ApiClient. Injects Bearer when a token exists; on 401 deletes
/// the token and drops to unauthenticated (no refresh flow exists).
final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(secureTokenStorageProvider);
  return ApiClient(
    baseUrl: ApiConstants.apiBaseUrl,
    getToken: storage.readToken,
    onUnauthorized: () async {
      await storage.deleteToken();
      try {
        ref.read(authControllerProvider.notifier).setStatus(
              AuthStatus.unauthenticated,
            );
      } catch (_) {
        // Provider may be disposed during tests; token delete is enough.
      }
    },
  );
});
