// GENERATED from Utilza_webApp/design-system/tokens.json — do not edit by hand.
// Shared Utilza design system for the Flutter app (light + dark).
// Usage: import 'design/app_tokens.dart'; ... color: AppColors.lightBackground ...
import 'package:flutter/material.dart';

/// Brand + typography.
class AppBrand {
  static const String name = 'Utilza';
  static const String tagline = 'Everyday tools, all in one place.';
  static const String fontFamily = 'Inter';

  static const double displaySize = 32;
  static const FontWeight displayWeight = FontWeight.w700;
  static const double titleSize = 20;
  static const FontWeight titleWeight = FontWeight.w600;
  static const double bodySize = 16;
  static const FontWeight bodyWeight = FontWeight.w400;
  static const double captionSize = 13;
  static const FontWeight captionWeight = FontWeight.w500;

  static TextStyle get display => const TextStyle(
        fontFamily: fontFamily,
        fontSize: displaySize,
        fontWeight: displayWeight,
        letterSpacing: -0.64,
      );
  static TextStyle get title => const TextStyle(
        fontFamily: fontFamily,
        fontSize: titleSize,
        fontWeight: titleWeight,
        letterSpacing: -0.2,
      );
  static TextStyle get body => const TextStyle(
        fontFamily: fontFamily,
        fontSize: bodySize,
        fontWeight: bodyWeight,
      );
  static TextStyle get caption => const TextStyle(
        fontFamily: fontFamily,
        fontSize: captionSize,
        fontWeight: captionWeight,
      );
}

/// Core palette (both themes + status hues shared across themes).
class AppColors {
  static const Color primary = Color(0xFF6366F1);
  static const Color primaryTop = Color(0xFF818CF8);
  static const Color primaryBottom = Color(0xFF4F46E5);
  static const Color primaryPressedEdge = Color(0xFF3730A3);

  static const Color lightBackground = Color(0xFFF6F7FB);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightText = Color(0xFF12122B);
  static const Color lightTextMuted = Color(0xFF6B6F8A);
  static const Color lightBorder = Color(0xFFE4E7F0);

  static const Color darkBackground = Color(0xFF0F1020);
  static const Color darkSurface = Color(0xFF1A1B2E);
  static const Color darkSurfaceElevated = Color(0xFF23253D);
  static const Color darkText = Color(0xFFF2F3FF);
  static const Color darkTextMuted = Color(0xFFA3A6C2);
  static const Color darkBorder = Color(0xFF2A2D49);

  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);

  /// AA-safe text inks (derived; fills/glows use the spec hues above).
  static const Color successInkLight = Color(0xFF047857);
  static const Color warningInkLight = Color(0xFFB45309);
  static const Color errorInkLight = Color(0xFFDC2626);
  static const Color successInkDark = Color(0xFF34D399);
  static const Color warningInkDark = Color(0xFFFBBF24);
  static const Color errorInkDark = Color(0xFFF87171);
}

/// Category accents: gradient top -> bottom.
class AppCategories {
  static const Map<String, List<Color>> gradients = {
    'calculators': [Color(0xFF818CF8), Color(0xFF4F46E5)],
    'date-time': [Color(0xFFFBBF24), Color(0xFFF59E0B)],
    'text': [Color(0xFF34D399), Color(0xFF059669)],
    'generators': [Color(0xFFF472B6), Color(0xFFDB2777)],
    'pdf': [Color(0xFFF87171), Color(0xFFDC2626)],
    'image': [Color(0xFF38BDF8), Color(0xFF0284C7)],
    'documents': [Color(0xFFA78BFA), Color(0xFF7C3AED)],
    'file': [Color(0xFFFB923C), Color(0xFFEA580C)],
    'url': [Color(0xFF2DD4BF), Color(0xFF0D9488)],
  };

  static const Map<String, String> labels = {
    'calculators': 'Calculators',
    'date-time': 'Date & Time',
    'text': 'Text',
    'generators': 'Generators',
    'pdf': 'PDF',
    'image': 'Image',
    'documents': 'Documents',
    'file': 'File Tools',
    'url': 'URL Tools',
  };
}

/// Shape, spacing, depth and motion.
class AppShape {
  static const double radiusCard = 20;
  static const double radiusTile = 16;
  static const double radiusButton = 14;
  static const double radiusChip = 999;
  static const List<double> spacing = [4, 8, 12, 16, 24, 32];

  /// 1px inner top highlight: white 90% light / 8% dark.
  static const Color innerHighlightLight = Color(0xE6FFFFFF);
  static const Color innerHighlightDark = Color(0x14FFFFFF);

  /// Tight shadow shared by all cards.
  static List<BoxShadow> tightShadow({bool dark = false}) => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.08),
          offset: const Offset(0, 1),
          blurRadius: 2,
        ),
      ];

  /// Soft wide glow tinted with the category color (20-25%).
  static List<BoxShadow> categoryGlow(Color category, {bool dark = false}) =>
      [
        BoxShadow(
          color: category.withValues(alpha: 0.22),
          offset: const Offset(0, 12),
          blurRadius: 24,
          spreadRadius: -8,
        ),
      ];

  static const double buttonEdgeHeight = 5;
  static const double buttonPressTravel = 4;
  static const double pressScale = 0.97;

  static const Duration motionFast = Duration(milliseconds: 150);
  static const Duration motionSlow = Duration(milliseconds: 250);
  static const Duration stagger = Duration(milliseconds: 40);
}

/// Primary button gradient shared by both platforms.
class AppGradients {
  static const LinearGradient primary = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [AppColors.primaryTop, AppColors.primaryBottom],
  );

  static LinearGradient category(String slug) {
    final colors = AppCategories.gradients[slug] ??
        [AppColors.primaryTop, AppColors.primaryBottom];
    return LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: colors,
    );
  }
}
