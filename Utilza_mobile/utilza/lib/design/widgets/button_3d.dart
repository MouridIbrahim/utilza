// Physical-key button: vertical gradient + 5px bottom edge in the
// pressed-edge color; on press it travels down 4px and the edge shrinks.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app_tokens.dart';

enum Button3DVariant { primary, secondary }

class Button3D extends StatefulWidget {
  const Button3D({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = Button3DVariant.primary,
    this.icon,
    this.loading = false,
    this.enabled = true,
    this.haptic = true,
    this.semanticLabel,
  });

  final String label;
  final VoidCallback? onPressed;
  final Button3DVariant variant;
  final IconData? icon;
  final bool loading;
  final bool enabled;
  final bool haptic;
  final String? semanticLabel;

  @override
  State<Button3D> createState() => _Button3DState();
}

class _Button3DState extends State<Button3D> {
  bool _pressed = false;

  bool get _active => widget.enabled && !widget.loading && widget.onPressed != null;

  void _tap() {
    if (!_active) return;
    if (widget.haptic) HapticFeedback.lightImpact();
    widget.onPressed!();
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final primary = widget.variant == Button3DVariant.primary;
    final gradient = primary
        ? AppGradients.primary
        : LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: dark
                ? const [Color(0xFF23253D), Color(0xFF1A1B2E)]
                : const [Color(0xFFFFFFFF), Color(0xFFEEF0F7)],
          );
    final edge = primary
        ? AppColors.primaryPressedEdge
        : (dark ? const Color(0xFF11122A) : const Color(0xFFC9CEDE));
    final ink = primary
        ? Colors.white
        : (dark ? AppColors.darkText : AppColors.lightText);

    return Semantics(
      button: true,
      label: widget.semanticLabel ?? widget.label,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _pressed = true),
        onTapUp: (_) => setState(() => _pressed = false),
        onTapCancel: () => setState(() => _pressed = false),
        onTap: _tap,
        child: AnimatedContainer(
          duration: AppShape.motionFast,
          curve: Curves.easeOut,
          transform: Matrix4.translationValues(0, _pressed ? AppShape.buttonPressTravel : 0, 0),
          padding: EdgeInsets.only(bottom: _pressed ? 1 : AppShape.buttonEdgeHeight),
          decoration: BoxDecoration(
            color: edge,
            borderRadius: BorderRadius.circular(AppShape.radiusButton + AppShape.buttonEdgeHeight),
          ),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppShape.radiusButton),
              gradient: gradient,
              border: primary
                  ? null
                  : Border.all(color: dark ? AppColors.darkBorder : AppColors.lightBorder),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (widget.loading)
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: ink,
                    ),
                  )
                else if (widget.icon != null)
                  Icon(widget.icon, size: 16, color: ink),
                if (widget.loading || widget.icon != null)
                  const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    widget.label,
                    style: AppBrand.body.copyWith(
                      color: ink,
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
