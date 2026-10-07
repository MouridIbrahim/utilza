import '../utils/json_helpers.dart';

/// User-scoped favorite. `toolId` is the tool `id`, never the slug.
class Favorite {
  const Favorite({
    required this.id,
    required this.userId,
    required this.toolId,
    this.createdAt,
    this.tool,
  });

  final String id;
  final String userId;
  final String toolId;
  final DateTime? createdAt;
  final FavoriteToolRef? tool;

  factory Favorite.fromJson(Map<String, dynamic> json) {
    final tool = json['tool'];
    return Favorite(
      id: stringOf(json, 'id'),
      userId: stringOf(json, 'userId'),
      toolId: stringOf(json, 'toolId'),
      createdAt: tryParseDate(json['createdAt']),
      tool: tool is Map<String, dynamic>
          ? FavoriteToolRef.fromJson(tool)
          : null,
    );
  }
}

class FavoriteToolRef {
  const FavoriteToolRef({
    required this.id,
    required this.name,
    required this.slug,
    this.icon,
  });

  final String id;
  final String name;
  final String slug;
  final String? icon;

  factory FavoriteToolRef.fromJson(Map<String, dynamic> json) {
    return FavoriteToolRef(
      id: stringOf(json, 'id'),
      name: stringOf(json, 'name'),
      slug: stringOf(json, 'slug'),
      icon: nullableStringOf(json, 'icon'),
    );
  }
}
