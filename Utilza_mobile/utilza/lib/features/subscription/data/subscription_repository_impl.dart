import '../../../core/models/models.dart';
import '../domain/subscription_repository.dart';
import 'subscription_remote_datasource.dart';

class SubscriptionRepositoryImpl implements SubscriptionRepository {
  SubscriptionRepositoryImpl(this._remote);
  final SubscriptionRemoteDataSource _remote;

  @override
  Future<Subscription> getMySubscription() => _remote.getMySubscription();
}
