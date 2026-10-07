import '../../../core/models/models.dart';
import '../domain/history_repository.dart';
import 'history_remote_datasource.dart';

class HistoryRepositoryImpl implements HistoryRepository {
  HistoryRepositoryImpl(this._remote);
  final HistoryRemoteDataSource _remote;

  @override
  Future<Pagination<ToolHistory>> getHistory(
      {int page = 1, int limit = 20}) {
    return _remote.getHistory(page: page, limit: limit);
  }

  @override
  Future<ToolHistory> record(
      {required String toolSlug, String? inputSummary}) {
    return _remote.createHistory(
      toolSlug: toolSlug,
      inputSummary: inputSummary,
    );
  }

  @override
  Future<void> clear() async {
    await _remote.clearHistory();
  }
}
