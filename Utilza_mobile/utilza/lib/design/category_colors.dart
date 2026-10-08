// Category accent access built on design/app_tokens.dart.
import 'package:flutter/material.dart';

import 'app_tokens.dart';

/// Gradient + glow + label for a catalogue category slug.
/// Unknown slugs fall back to the primary gradient.
class CategoryColors {
  static List<Color> gradientFor(String? slug) =>
      AppCategories.gradients[slug] ??
      [AppColors.primaryTop, AppColors.primaryBottom];

  static String labelFor(String? slug, {String fallback = 'Tools'}) =>
      AppCategories.labels[slug] ?? fallback;

  /// Soft wide glow tinted with the category color (spec: 20-25%).
  static Color glowFor(String? slug) {
    final bottom = gradientFor(slug).last;
    return bottom.withValues(alpha: 0.22);
  }
}
