// 3D tool card: layered shadows (tight + category glow), soft top
// highlight, gradient icon tile, press-scale with haptic feedback.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/models/models.dart';
import '../app_colors.dart';
import '../app_tokens.dart';
import '../category_colors.dart';
import '../icon_mapper.dart';
import 'icon_tile.dart';

class ToolCard3D extends StatefulWidget {
  const ToolCard3D({
    super.key,
    required this.tool,
    required this.onTap,
    this.heroTag,
  });

  final Tool tool;
  final VoidCallback onTap;
  final Object? heroTag;

  @override
  State<ToolCard3D> createState() => _ToolCard3DState();
}

class _ToolCard3DState extends State<ToolCard3D> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final c = AppColorScheme.of(context);
    final dark = c.isDark;
    final slug = widget.tool.category?.slug;
    final icon = toolIconFor(
      iconKey: widget.tool.icon,
      categorySlug: slug,
    );
    final card = AnimatedScale(
      scale: _pressed ? AppShape.pressScale : 1.0,
      duration: AppShape.motionFast,
      curve: Curves.easeOut,
      child: Stack(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius:
                  BorderRadius.circular(AppShape.radiusCard),
              border: Border.all(color: c.border),
              boxShadow: [
                ...AppShape.tightShadow(dark: dark),
                ...AppShape.categoryGlow(
                  CategoryColors.gradientFor(slug).last,
                  dark: dark,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IconTile(
                      icon: icon,
                      categorySlug: slug,
                      semanticLabel: '${widget.tool.name} icon',
                    ),
                    const Spacer(),
                    Icon(
                      Icons.chevron_right,
                      color: c.textMuted,
                      semanticLabel: 'Open ${widget.tool.name}',
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  widget.tool.name,
                  style: AppBrand.title.copyWith(
                    color: c.text,
                    fontSize: 16,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  widget.tool.description,
                  style: AppBrand.body.copyWith(
                    color: c.textMuted,
                    fontSize: 13,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                _CapabilityBadge(tool: widget.tool),
              ],
            ),
          ),
          // 1px inner top highlight. A Border with per-side colors cannot
          // coexist with borderRadius (paint assertion), so it is an overlay.
          Positioned(
            top: 1,
            left: 20,
            right: 20,
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

    final tappable = GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: () {
        HapticFeedback.lightImpact();
        widget.onTap();
      },
      child: card,
    );

    final tag = widget.heroTag;
    if (tag == null) return tappable;
    return Hero(tag: tag, child: Material(type: MaterialType.transparency, child: tappable));
  }
}

/// Single compact Server/Local badge (file/auth/offline detail lives in
/// the workspace, shown before upload).
class _CapabilityBadge extends StatelessWidget {
  const _CapabilityBadge({required this.tool});
  final Tool tool;

  @override
  Widget build(BuildContext context) {
    final c = AppColorScheme.of(context);
    final backend = tool.implementation == 'backend';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: c.isDark ? 0.22 : 0.1),
        borderRadius: BorderRadius.circular(AppShape.radiusChip),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            backend ? Icons.cloud_outlined : Icons.phone_android,
            size: 13,
            color: AppColors.primary,
          ),
          const SizedBox(width: 4),
          Text(
            backend ? 'Server' : 'Local',
            style: AppBrand.caption.copyWith(
              color: AppColors.primary,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
