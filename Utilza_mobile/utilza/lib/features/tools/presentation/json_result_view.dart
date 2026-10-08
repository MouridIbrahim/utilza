import 'package:flutter/material.dart';

/// Generic recursive JSON viewer. Per-tool structured views may replace
/// this; the framework never assumes a result shape.
class JsonResultView extends StatelessWidget {
  const JsonResultView({super.key, required this.data});
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) {
      return const Text('No result available.');
    }
    return Column(
      children: [
        for (final entry in data.entries)
          _JsonEntry(keyName: entry.key, value: entry.value),
      ],
    );
  }
}

class _JsonEntry extends StatelessWidget {
  const _JsonEntry({required this.keyName, required this.value});
  final String keyName;
  final dynamic value;

  @override
  Widget build(BuildContext context) {
    if (value is Map<String, dynamic>) {
      return ExpansionTile(
        title: Text(keyName),
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 16),
            child: JsonResultView(data: value),
          ),
        ],
      );
    }
    if (value is List) {
      final list = value as List;
      if (list.isEmpty) {
        return ListTile(
          title: Text(keyName),
          subtitle: const Text('[]'),
        );
      }
      return ExpansionTile(
        title: Text('$keyName (${list.length})'),
        children: [
          for (var i = 0; i < (list.length > 20 ? 20 : list.length); i++)
            ListTile(
              dense: true,
              title: Text(
                list[i] is Map || list[i] is List
                    ? list[i].toString()
                    : '$keyName[${i + 1}]: ${list[i]}',
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          if (list.length > 20)
            ListTile(
              dense: true,
              title: Text('… and ${list.length - 20} more'),
            ),
        ],
      );
    }
    return ListTile(
      dense: true,
      title: Text(keyName),
      subtitle: SelectableText('$value'),
    );
  }
}
