import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';

class SubscriptionRemoteDataSource {
  SubscriptionRemoteDataSource(this._client);
  final ApiClient _client;

  /// Bearer required. Returns the subscription or `{status:free,tier:free}`.
  Future<Subscription> getMySubscription() {
    return _client.get<Subscription>(
      '/subscriptions/me',
      fromData: (data) => Subscription.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
    );
  }
}
