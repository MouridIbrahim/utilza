import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';

class ProfileRemoteDataSource {
  ProfileRemoteDataSource(this._client);
  final ApiClient _client;

  Future<PublicUser> getProfile() {
    return _client.get<PublicUser>(
      '/users/me',
      fromData: (data) => PublicUser.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
    );
  }

  /// Name 1–100 chars. `null` is accepted by validation but does NOT
  /// clear the stored name, so callers must not offer clearing.
  Future<PublicUser> updateName(String name) {
    return _client.patch<PublicUser>(
      '/users/me',
      body: {'name': name},
      fromData: (data) => PublicUser.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
    );
  }

  Future<bool> deleteAccount() {
    return _client.delete<bool>(
      '/users/me',
      fromData: (data) {
        if (data is Map<String, dynamic>) {
          return data['deleted'] == true;
        }
        return true;
      },
    );
  }
}
