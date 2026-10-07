import 'dart:io';

import 'package:flutter/foundation.dart';

import '../../../core/network/api_client.dart';

/// Minimal analytics writer used by catalogue (full strategy in Phase 11).
/// Public endpoint, fire-and-forget, never sends PII.
class AnalyticsRemoteDataSource {
  AnalyticsRemoteDataSource(this._client);
  final ApiClient _client;

  String get _platform {
    if (kIsWeb) return 'web';
    try {
      if (Platform.isAndroid) return 'android';
      if (Platform.isIOS) return 'ios';
    } catch (_) {
      // Platform may be unavailable in tests.
    }
    return 'unknown';
  }

  Future<void> logEvent(String event, {String? toolSlug}) async {
    try {
      await _client.post<Map>(
        '/analytics',
        body: {
          'event': event,
          'toolSlug': toolSlug,
          'platform': _platform,
        }..removeWhere((_, v) => v == null),
        fromData: (data) => data is Map ? data.cast<String, dynamic>() : {},
        auth: false,
      );
    } catch (_) {
      // Fire-and-forget: never block UX.
    }
  }
}
