// Material 3 themes generated from the shared design tokens.
// Inter via google_fonts; light + dark are dedicated palettes (no inversion).
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../design/app_tokens.dart';

abstract final class AppTheme {
  static const _radiusCard = AppShape.radiusCard;
  static const _radiusButton = AppShape.radiusButton;

  static TextTheme _text(bool dark) {
    final base = ThemeData(brightness: dark ? Brightness.dark : Brightness.light).textTheme;
    final inter = GoogleFonts.interTextTheme(base);
    Color color(bool muted) => muted
        ? (dark ? AppColors.darkTextMuted : AppColors.lightTextMuted)
        : (dark ? AppColors.darkText : AppColors.lightText);
    return inter.copyWith(
      displayLarge: AppBrand.display.copyWith(color: color(false)),
      titleLarge: AppBrand.title.copyWith(color: color(false)),
      bodyLarge: AppBrand.body.copyWith(color: color(false)),
      bodyMedium: AppBrand.body.copyWith(
        color: color(false),
        fontSize: 14,
      ),
      labelLarge: AppBrand.caption.copyWith(color: color(false)),
      bodySmall: AppBrand.caption.copyWith(color: color(true)),
    );
  }

  static ColorScheme _scheme(bool dark) {
    if (dark) {
      return const ColorScheme(
        brightness: Brightness.dark,
        primary: AppColors.primaryTop,
        onPrimary: AppColors.darkBackground,
        primaryContainer: Color(0xFF232A4D),
        onPrimaryContainer: Color(0xFFE0E3FF),
        secondary: Color(0xFFA78BFA),
        onSecondary: AppColors.darkBackground,
        surface: AppColors.darkSurface,
        onSurface: AppColors.darkText,
        surfaceContainerHighest: AppColors.darkSurfaceElevated,
        error: AppColors.errorInkDark,
        onError: AppColors.darkBackground,
        outline: AppColors.darkBorder,
      );
    }
    return const ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.primary,
      onPrimary: Colors.white,
      primaryContainer: Color(0xFFECEFFD),
      onPrimaryContainer: Color(0xFF232A68),
      secondary: Color(0xFF7C3AED),
      onSecondary: Colors.white,
      surface: AppColors.lightSurface,
      onSurface: AppColors.lightText,
      surfaceContainerHighest: Color(0xFFEEF0F7),
      error: AppColors.errorInkLight,
      onError: Colors.white,
      outline: AppColors.lightBorder,
    );
  }

  static ThemeData _base(bool dark) {
    final scheme = _scheme(dark);
    final borderColor = dark ? AppColors.darkBorder : AppColors.lightBorder;
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor:
          dark ? AppColors.darkBackground : AppColors.lightBackground,
      textTheme: _text(dark),
      appBarTheme: AppBarTheme(
        backgroundColor: dark ? AppColors.darkBackground : AppColors.lightBackground,
        foregroundColor: dark ? AppColors.darkText : AppColors.lightText,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: dark ? AppColors.darkSurface : AppColors.lightSurface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_radiusCard),
          side: BorderSide(color: borderColor),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: dark ? AppColors.darkSurface : AppColors.lightSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusButton),
          borderSide: BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusButton),
          borderSide: BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusButton),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppShape.radiusChip),
        ),
      ),
    );
  }

  static ThemeData light() => _base(false);
  static ThemeData dark() => _base(true);
}
