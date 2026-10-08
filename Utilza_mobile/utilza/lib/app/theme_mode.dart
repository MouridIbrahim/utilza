// ThemeMode state persisted as a tiny JSON file (path_provider is
// already a dependency, so no new package is needed for this).
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

Future<File> _themeFile() async {
  final dir = await getApplicationDocumentsDirectory();
  return File('${dir.path}/utilza-theme.json');
}

ThemeMode _decode(Object? raw) {
  switch (raw) {
    case 'light':
      return ThemeMode.light;
    case 'dark':
      return ThemeMode.dark;
    default:
      return ThemeMode.system;
  }
}

String _encode(ThemeMode mode) {
  switch (mode) {
    case ThemeMode.light:
      return 'light';
    case ThemeMode.dark:
      return 'dark';
    case ThemeMode.system:
      return 'system';
  }
}

/// User's theme choice. Defaults to system; changes persist across restarts.
class ThemeModeController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    _load();
    return ThemeMode.system;
  }

  Future<void> _load() async {
    try {
      final file = await _themeFile();
      if (!await file.exists()) return;
      final raw = jsonDecode(await file.readAsString());
      if (raw is Map<String, dynamic>) {
        state = _decode(raw['mode']);
      }
    } catch (_) {
      // Corrupt/missing file -> stay on system default.
    }
  }

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    try {
      final file = await _themeFile();
      await file.writeAsString(jsonEncode({'mode': _encode(mode)}));
    } catch (_) {
      // Storage failure must never break the UI.
    }
  }

  Future<void> toggleLightDark(BuildContext context) async {
    final dark = Theme.of(context).brightness == Brightness.dark;
    await setMode(dark ? ThemeMode.light : ThemeMode.dark);
  }
}

final themeModeControllerProvider =
    NotifierProvider<ThemeModeController, ThemeMode>(
        ThemeModeController.new);
