import '../../../core/models/models.dart';

abstract class HistoryRepository {
  Future<Pagination<ToolHistory>> getHistory({int page, int limit});
  Future<ToolHistory> record({required String toolSlug, String? inputSummary});
  Future<void> clear();
}
