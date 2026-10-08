// Floating rounded bottom navigation shell for the 5 main tabs.
// Admin routes stay outside the shell (reached from Profile when admin).
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../design/app_colors.dart';
import '../design/app_tokens.dart';
import 'router.dart';

class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _tabs = [
    (AppRoutes.home, Icons.home_outlined, Icons.home, 'Home'),
    (AppRoutes.search, Icons.search_outlined, Icons.search, 'Search'),
    (
      AppRoutes.favorites,
      Icons.favorite_outline,
      Icons.favorite,
      'Favorites'
    ),
    (AppRoutes.history, Icons.history_outlined, Icons.history, 'History'),
    (AppRoutes.profile, Icons.person_outline, Icons.person, 'Profile'),
  ];

  void _go(int index) {
    HapticFeedback.selectionClick();
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColorScheme.of(context);
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: c.border),
              boxShadow: AppShape.tightShadow(dark: c.isDark),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                for (var i = 0; i < _tabs.length; i++)
                  _TabButton(
                    icon: navigationShell.currentIndex == i
                        ? _tabs[i].$3
                        : _tabs[i].$2,
                    label: _tabs[i].$4,
                    selected: navigationShell.currentIndex == i,
                    onTap: () => _go(i),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected
        ? AppColors.primary
        : AppColorScheme.of(context).textMuted;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(height: 2),
              Text(
                label,
                style: AppBrand.caption.copyWith(
                  color: color,
                  fontSize: 11,
                  fontWeight:
                      selected ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
