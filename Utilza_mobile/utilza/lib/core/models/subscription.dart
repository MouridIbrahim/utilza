import '../utils/json_helpers.dart';

/// Read-only subscription. Purchasing is NOT implemented; webhook is 501.
/// Absent subscription is represented as free/free.
class Subscription {
  const Subscription({
    required this.status,
    required this.tier,
    this.currentPeriodEnd,
    this.cancelAtPeriodEnd = false,
  });

  final String status;
  final String tier;
  final DateTime? currentPeriodEnd;
  final bool cancelAtPeriodEnd;

  bool get isFree => status == 'free' || tier == 'free';

  factory Subscription.free() =>
      const Subscription(status: 'free', tier: 'free');

  factory Subscription.fromJson(Map<String, dynamic> json) {
    if (json.isEmpty) return Subscription.free();
    return Subscription(
      status: stringOf(json, 'status', fallback: 'free'),
      tier: stringOf(json, 'tier', fallback: 'free'),
      currentPeriodEnd: tryParseDate(
        json['currentPeriodEnd'] ?? json['current_period_end'],
      ),
      cancelAtPeriodEnd: json.containsKey('cancelAtPeriodEnd')
          ? boolOf(json, 'cancelAtPeriodEnd')
          : false,
    );
  }
}
