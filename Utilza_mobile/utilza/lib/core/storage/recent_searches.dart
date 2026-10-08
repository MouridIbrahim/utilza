// Recent catalogue searches, stored locally as JSON (path_provider is
// already a dependency). Never sent anywhere except as a future query.
import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

const _fileName = 'utilza-recent-searches.json';
const _maxItems = 6;

Future<File> _file() async {
  final dir = await getApplicationDocumentsDirectory();
  return File('${dir.path}/$_fileName');
}

Future<List<String>> getRecentSearches() async {
  try {
    final file = await _file();
    if (!await file.exists()) return [];
    final raw = jsonDecode(await file.readAsString());
    if (raw is! List) return [];
    return raw.whereType<String>().take(_maxItems).toList();
  } catch (_) {
    return [];
  }
}

Future<void> saveRecentSearch(String query) async {
  final q = query.trim();
  if (q.isEmpty) return;
  try {
    final current = await getRecentSearches();
    final next = [q, ...current.where((s) => s != q)].take(_maxItems).toList();
    await (await _file()).writeAsString(jsonEncode(next));
  } catch (_) {
    // Storage failure must never break search.
  }
}
