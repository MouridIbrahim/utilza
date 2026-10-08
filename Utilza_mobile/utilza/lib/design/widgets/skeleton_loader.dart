// Shimmer skeleton placeholders (skips animation when the OS requests
// reduced motion).
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../app_colors.dart';
import '../app_tokens.dart';

class SkeletonLoader extends StatelessWidget {
  const SkeletonLoader({
    super.key,
    this.width,
    this.height = 16,
    this.borderRadius = 8,
    this.semanticLabel = 'Loading',
  });

  final double? width;
  final double height;
  final double borderRadius;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = AppColorScheme.of(context);
    final reduced =
        MediaQuery.of(context).disableAnimations == true;
    Widget box = Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: c.border),
      ),
    );
    if (!reduced) {
      box = box
          .animate(onPlay: (c) => c.repeat())
          .shimmer(duration: AppShape.motionSlow, color: c.border);
    }
    return Semantics(label: semanticLabel, child: box);
  }
}

/// Card-shaped skeleton used in tool grids.
class SkeletonCard extends StatelessWidget {
  const SkeletonCard({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            SkeletonLoader(width: 48, height: 48, borderRadius: 16),
            SizedBox(width: 12),
            Expanded(child: SkeletonLoader(height: 18)),
          ],
        ),
        SizedBox(height: 12),
        SkeletonLoader(height: 14),
        SizedBox(height: 6),
        SkeletonLoader(width: 160, height: 14),
      ],
    );
  }
}
