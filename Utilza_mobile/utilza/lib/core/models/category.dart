import '../utils/json_helpers.dart';

/// Catalogue category. Backend returns active only, sorted by sortOrder.
/// Fallback catalogue data may omit optional fields → all but slug are
/// defensive.
class Category {
  const Category({
    required this.id,
    required this.slug,
    required this.name,
    this.description,
    this.icon,
    this.isActive = true,
    this.sortOrder = 0,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String slug;
  final String name;
  final String? description;
  final String? icon;
  final bool isActive;
  final int sortOrder;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: stringOf(json, 'id'),
      slug: stringOf(json, 'slug'),
      name: stringOf(json, 'name'),
      description: nullableStringOf(json, 'description'),
      icon: nullableStringOf(json, 'icon'),
      isActive: json.containsKey('isActive')
          ? boolOf(json, 'isActive', fallback: true)
          : true,
      sortOrder: nullableIntOf(json, 'sortOrder') ?? 0,
      createdAt: tryParseDate(json['createdAt']),
      updatedAt: tryParseDate(json['updatedAt']),
    );
  }
}
