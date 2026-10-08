// Branded empty state: gradient icon tile + title + detail + action.
import 'package:flutter/material.dart';

import '../app_colors.dart';
import '../app_tokens.dart';
import 'button_3d.dart';
import 'icon_tile.dart';

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    this.detail,
    this.icon = Icons.inbox_outlined,
    this.categorySlug,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? detail;
  final IconData icon;
  final String? categorySlug;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final c = AppColorScheme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconTile(
              icon: icon,
              categorySlug: categorySlug,
              size: 56,
              semanticLabel: title,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: AppBrand.title.copyWith(color: c.text),
              textAlign: TextAlign.center,
            ),
            if (detail != null) ...[
              const SizedBox(height: 8),
              Text(
                detail!,
                style: AppBrand.body.copyWith(color: c.textMuted),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 16),
              Button3D(label: actionLabel!, onPressed: onAction),
            ],
          ],
        ),
      ),
    );
  }
}
