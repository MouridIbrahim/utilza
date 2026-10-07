import '../utils/json_helpers.dart';

/// Offset pagination envelope used by tools/history/admin lists.
class Pagination<T> {
  const Pagination({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
  });

  final List<T> items;
  final int page;
  final int limit;
  final int total;

  int get totalPages =>
      limit <= 0 ? 0 : ((total + limit - 1) ~/ limit);

  bool get hasMore => page * limit < total;

  static Pagination<T> fromJson<T>(
    Map<String, dynamic> json,
    T Function(dynamic item) fromItem,
  ) {
    return Pagination<T>(
      items: listOf(json['items'], fromItem),
      page: intOf(json, 'page', fallback: 1),
      limit: intOf(json, 'limit', fallback: 20),
      total: intOf(json, 'total'),
    );
  }
}
