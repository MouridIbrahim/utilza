import '../../../core/models/models.dart';

abstract class SubscriptionRepository {
  Future<Subscription> getMySubscription();
}
