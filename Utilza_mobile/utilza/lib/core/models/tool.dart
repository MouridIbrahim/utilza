import '../utils/json_helpers.dart';

/// Catalogue tool. `implementation` is `frontend` (local) or `backend`.
/// Never derive an endpoint from `slug`; use the exact route map.
class Tool {
  const Tool({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    this.icon,
    this.isActive = true,
    this.sortOrder = 0,
    required this.implementation,
    this.platforms = const [],
    this.requiresFile = false,
    this.requiresAuth = false,
    this.supportsOffline = false,
    this.categoryId,
    this.createdAt,
    this.updatedAt,
    this.category,
  });

  final String id;
  final String name;
  final String slug;
  final String description;
  final String? icon;
  final bool isActive;
  final int sortOrder;
  final String implementation;
  final List<String> platforms;
  final bool requiresFile;
  final bool requiresAuth;
  final bool supportsOffline;
  final String? categoryId;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final ToolCategoryRef? category;

  bool get isFrontend => implementation == 'frontend';
  bool get isBackend => implementation == 'backend';

  factory Tool.fromJson(Map<String, dynamic> json) {
    final cat = json['category'];
    return Tool(
      id: stringOf(json, 'id'),
      name: stringOf(json, 'name'),
      slug: stringOf(json, 'slug'),
      description: stringOf(json, 'description'),
      icon: nullableStringOf(json, 'icon'),
      isActive: json.containsKey('isActive')
          ? boolOf(json, 'isActive', fallback: true)
          : true,
      sortOrder: nullableIntOf(json, 'sortOrder') ?? 0,
      implementation: stringOf(json, 'implementation', fallback: 'backend'),
      platforms: listOf(json['platforms'], (e) => e.toString()),
      requiresFile: boolOf(json, 'requiresFile'),
      requiresAuth: boolOf(json, 'requiresAuth'),
      supportsOffline: boolOf(json, 'supportsOffline'),
      categoryId: nullableStringOf(json, 'categoryId'),
      createdAt: tryParseDate(json['createdAt']),
      updatedAt: tryParseDate(json['updatedAt']),
      category: cat is Map<String, dynamic>
          ? ToolCategoryRef.fromJson(cat)
          : null,
    );
  }
}

class ToolCategoryRef {
  const ToolCategoryRef({required this.slug, required this.name});

  final String slug;
  final String name;

  factory ToolCategoryRef.fromJson(Map<String, dynamic> json) {
    return ToolCategoryRef(
      slug: stringOf(json, 'slug'),
      name: stringOf(json, 'name'),
    );
  }
}
