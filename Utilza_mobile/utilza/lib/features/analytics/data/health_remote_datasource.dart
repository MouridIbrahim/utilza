import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/json_helpers.dart';

/// Public liveness: `{status, uptime}`.
class HealthStatus {
  const HealthStatus({required this.status, this.uptime});

  final String status;
  final int? uptime;

  bool get isOk => status == 'ok';

  factory HealthStatus.fromJson(Map<String, dynamic> json) {
    return HealthStatus(
      status: stringOf(json, 'status'),
      uptime: nullableIntOf(json, 'uptime'),
    );
  }
}

/// API health: `{status, uptime, db, version}`.
/// `db:false` means the process is alive but the database is unreachable.
class ApiHealthStatus {
  const ApiHealthStatus({
    required this.status,
    this.uptime,
    this.db,
    this.version,
  });

  final String status;
  final int? uptime;
  final bool? db;
  final String? version;

  bool get isOk => status == 'ok';
  bool get dbReachable => db == true;

  factory ApiHealthStatus.fromJson(Map<String, dynamic> json) {
    final db = json['db'];
    return ApiHealthStatus(
      status: stringOf(json, 'status'),
      uptime: nullableIntOf(json, 'uptime'),
      db: db is bool ? db : null,
      version: nullableStringOf(json, 'version'),
    );
  }
}

/// Optional diagnostics. Public, unauthenticated, never blocks UX.
class HealthRemoteDataSource {
  HealthRemoteDataSource(this._client);
  final ApiClient _client;

  Future<HealthStatus> liveness() {
    return _client.get<HealthStatus>(
      ApiConstants.healthUrl,
      fromData: (data) => HealthStatus.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
      auth: false,
    );
  }

  Future<ApiHealthStatus> apiHealth() {
    return _client.get<ApiHealthStatus>(
      '/health',
      fromData: (data) => ApiHealthStatus.fromJson(
        data is Map<String, dynamic> ? data : <String, dynamic>{},
      ),
      auth: false,
    );
  }
}
