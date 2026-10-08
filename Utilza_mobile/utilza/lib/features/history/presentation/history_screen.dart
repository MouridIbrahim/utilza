import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/widgets/common.dart';
import 'history_providers.dart';

/// Authenticated tool history, newest first, with pagination + clear.
class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    Future.microtask(
      () => ref.read(historyControllerProvider.notifier).loadFirst(),
    );
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.pixels >=
        _scroll.position.maxScrollExtent - 300) {
      ref.read(historyControllerProvider.notifier).loadMore();
    }
  }

  Future<void> _confirmClear() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear history?'),
        content: const Text(
          'This permanently deletes your tool history. There is no undo.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await ref.read(historyControllerProvider.notifier).clear();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ErrorMapper.userMessage(e))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(historyControllerProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('History'),
        actions: [
          if (state.items.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: _confirmClear,
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(historyControllerProvider.notifier).refresh(),
        child: Builder(
          builder: (context) {
            if (state.isLoading) {
              return const AppLoading(message: 'Loading history…');
            }
            if (state.errorMessage != null && state.items.isEmpty) {
              return AppErrorView(
                message: state.errorMessage!,
                onRetry: () => ref
                    .read(historyControllerProvider.notifier)
                    .refresh(),
              );
            }
            if (state.items.isEmpty) {
              return const AppEmpty(message: 'No recent tools.');
            }
            return ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.all(16),
              itemCount:
                  state.items.length + (state.isLoadingMore ? 1 : 0),
              itemBuilder: (context, i) {
                if (i >= state.items.length) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final h = state.items[i];
                return Card(
                  child: ListTile(
                    title: Text(h.toolSlug),
                    subtitle: h.inputSummary?.isNotEmpty == true
                        ? Text(
                            h.inputSummary!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          )
                        : null,
                    trailing: h.createdAt != null
                        ? Text(
                            '${h.createdAt!.toLocal()}'.substring(0, 10),
                            style:
                                Theme.of(context).textTheme.bodySmall,
                          )
                        : null,
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
