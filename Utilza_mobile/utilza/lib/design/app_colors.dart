// Brightness-aware color access built on design/app_tokens.dart.
// Use `AppColorScheme.of(context)` instead of raw AppColors so widgets
// automatically follow light/dark mode.
import 'package:flutter/material.dart';

import 'app_tokens.dart';

/// Resolved (single-brightness) palette for the current theme.
class AppColorScheme {
  const AppColorScheme({
    required this.background,
    required this.surface,
    required this.surfaceElevated,
    required this.text,
    required this.textMuted,
    required this.border,
    required this.successInk,
    required this.warningInk,
    required this.errorInk,
    required this.isDark,
  });

  final Color background;
  final Color surface;
  final Color surfaceElevated;
  final Color text;
  final Color textMuted;
  final Color border;
  final Color successInk;
  final Color warningInk;
  final Color errorInk;
  final bool isDark;

  static const AppColorScheme light = AppColorScheme(
    background: AppColors.lightBackground,
    surface: AppColors.lightSurface,
    surfaceElevated: AppColors.lightSurface,
    text: AppColors.lightText,
    textMuted: AppColors.lightTextMuted,
    border: AppColors.lightBorder,
    successInk: AppColors.successInkLight,
    warningInk: AppColors.warningInkLight,
    errorInk: AppColors.errorInkLight,
    isDark: false,
  );

  static const AppColorScheme dark = AppColorScheme(
    background: AppColors.darkBackground,
    surface: AppColors.darkSurface,
    surfaceElevated: AppColors.darkSurfaceElevated,
    text: AppColors.darkText,
    textMuted: AppColors.darkTextMuted,
    border: AppColors.darkBorder,
    successInk: AppColors.successInkDark,
    warningInk: AppColors.warningInkDark,
    errorInk: AppColors.errorInkDark,
    isDark: true,
  );

  static AppColorScheme of(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? dark : light;
}
