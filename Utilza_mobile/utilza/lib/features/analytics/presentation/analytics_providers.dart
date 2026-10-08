import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/providers.dart';
import '../data/analytics_remote_datasource.dart';
import '../data/health_remote_datasource.dart';

/// Shared allowlisted analytics writer (POST /api/v1/analytics).
/// Public, fire-and-forget, never sends PII.
final analyticsProvider = Provider<AnalyticsRemoteDataSource>((ref) {
  return AnalyticsRemoteDataSource(ref.watch(apiClientProvider));
});

/// Optional diagnostics (GET /health, GET /api/v1/health).
final healthDataSourceProvider = Provider<HealthRemoteDataSource>((ref) {
  return HealthRemoteDataSource(ref.watch(apiClientProvider));
});
