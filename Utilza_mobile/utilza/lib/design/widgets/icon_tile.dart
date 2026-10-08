// Gradient icon tile with a soft colored glow (shared 3D look).
import 'package:flutter/material.dart';

import '../app_tokens.dart';
import '../category_colors.dart';

/// Square gradient tile for tool/category icons.
class IconTile extends StatelessWidget {
  const IconTile({
    super.key,
    required this.icon,
    required this.categorySlug,
    this.size = 48,
    this.semanticLabel,
  });

  final IconData icon;
  final String? categorySlug;
  final double size;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final colors = CategoryColors.gradientFor(categorySlug);
    final radius = (size * 0.33).clamp(12.0, 20.0);
    return Semantics(
      label: semanticLabel,
      child: Stack(
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: colors,
              ),
              boxShadow: [
                ...AppShape.tightShadow(dark: dark),
                ...AppShape.categoryGlow(colors.last, dark: dark),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: size * 0.48),
          ),
          // 1px inner top highlight (see ToolCard3D: a per-side Border
          // cannot coexist with borderRadius).
          Positioned(
            top: 2,
            left: size * 0.25,
            right: size * 0.25,
            child: Container(
              height: 1,
              color: dark
                  ? AppShape.innerHighlightDark
                  : AppShape.innerHighlightLight,
            ),
          ),
        ],
      ),
    );
  }
}
