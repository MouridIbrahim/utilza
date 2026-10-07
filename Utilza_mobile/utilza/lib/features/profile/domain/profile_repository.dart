import '../../../core/models/models.dart';

abstract class ProfileRepository {
  Future<PublicUser> getProfile();
  Future<PublicUser> updateName(String name);
  Future<void> deleteAccount();
}
