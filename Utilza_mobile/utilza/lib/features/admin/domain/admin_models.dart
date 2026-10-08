import '../../../core/utils/json_helpers.dart';

/// Server-authorized admin tool row. No role is stored locally;
/// listing succeeds only when the backend allows it.
class AdminTool {
  const AdminTool({
    required this.id,
    required this.name,
    required this.slug,
    this.isActive = true,
    this.categoryId,
    this.sortOrder = 0,
  });

  final String id;
  final String name;
  final String slug;
  final bool isActive;
  final String? categoryId;
  final int sortOrder;

  factory AdminTool.fromJson(Map<String, dynamic> json) {
    return AdminTool(
      id: stringOf(json, 'id'),
      name: stringOf(json, 'name'),
      slug: stringOf(json, 'slug'),
      isActive: json.containsKey('isActive')
          ? boolOf(json, 'isActive', fallback: true)
          : true,
      categoryId: nullableStringOf(json, 'categoryId'),
      sortOrder: nullableIntOf(json, 'sortOrder') ?? 0,
    );
  }
}

/// Server-authorized admin user row.
class AdminUser {
  const AdminUser({
    required this.id,
    required this.email,
    this.name,
    this.createdAt,
  });

  final String id;
  final String email;
  final String? name;
  final DateTime? createdAt;

  factory AdminUser.fromJson(Map<String, dynamic> json) {
    return AdminUser(
      id: stringOf(json, 'id'),
      email: stringOf(json, 'email'),
      name: nullableStringOf(json, 'name'),
      createdAt: tryParseDate(json['createdAt']),
    );
  }
}
