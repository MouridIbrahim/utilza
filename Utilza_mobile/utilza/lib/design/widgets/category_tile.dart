// Colored gradient squircle tile with icon + label for one category.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app_tokens.dart';
import '../category_colors.dart';
import '../icon_mapper.dart';

class CategoryTile extends StatelessWidget {
  const CategoryTile({
    super.key,
    required this.slug,
    required this.label,
    required this.onTap,
    this.selected = false,
  });

  final String slug;
  final String label;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Semantics(
      button: true,
      selected: selected,
      label: '$label category',
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: dark ? AppColors.darkSurface : AppColors.lightSurface,
            borderRadius: BorderRadius.circular(AppShape.radiusTile),
            border: Border.all(
              color: selected
                  ? AppColors.primary
                  : (dark ? AppColors.darkBorder : AppColors.lightBorder),
              width: selected ? 2 : 1,
            ),
            boxShadow: AppShape.tightShadow(dark: dark),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: CategoryColors.gradientFor(slug),
                  ),
                  boxShadow: [
                    ...AppShape.tightShadow(dark: dark),
                    ...AppShape.categoryGlow(
                      CategoryColors.gradientFor(slug).last,
                      dark: dark,
                    ),
                  ],
                ),
                child: Icon(categoryIconFor(slug),
                    color: Colors.white, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: AppBrand.caption.copyWith(
                  color: dark ? AppColors.darkText : AppColors.lightText,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
