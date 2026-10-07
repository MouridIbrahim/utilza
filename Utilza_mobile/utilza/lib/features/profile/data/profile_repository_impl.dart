import '../../../core/models/models.dart';
import '../domain/profile_repository.dart';
import 'profile_remote_datasource.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  ProfileRepositoryImpl(this._remote);
  final ProfileRemoteDataSource _remote;

  @override
  Future<PublicUser> getProfile() => _remote.getProfile();

  @override
  Future<PublicUser> updateName(String name) =>
      _remote.updateName(name.trim());

  @override
  Future<void> deleteAccount() async {
    await _remote.deleteAccount();
  }
}
