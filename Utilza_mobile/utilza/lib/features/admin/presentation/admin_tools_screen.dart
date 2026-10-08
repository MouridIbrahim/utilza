import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common.dart';
import 'admin_providers.dart';

/// Optional read-only admin tools list. Access is decided by the
/// backend: 403 FORBIDDEN hides the list. No local role/email check,
/// no mutations.
class AdminToolsScreen extends ConsumerStatefulWidget {
  const AdminToolsScreen({super.key});

  @override
  ConsumerState<AdminToolsScreen> createState() =>
      _AdminToolsScreenState();
}

class _AdminToolsScreenState extends ConsumerState<AdminToolsScreen> {
  final _search = TextEditingController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    Future.microtask(
      () => ref.read(adminToolsControllerProvider.notifier).loadFirst(),
    );
  }

  @override
  void dispose() {
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.pixels >=
        _scroll.position.maxScrollExtent - 300) {
      ref.read(adminToolsControllerProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminToolsControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Admin tools')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _search,
              decoration: InputDecoration(
                labelText: 'Search tools',
                suffixIcon: IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: () => ref
                      .read(adminToolsControllerProvider.notifier)
                      .loadFirst(search: _search.text),
                ),
              ),
              textInputAction: TextInputAction.search,
              onSubmitted: (v) => ref
                  .read(adminToolsControllerProvider.notifier)
                  .loadFirst(search: v),
            ),
          ),
          Expanded(
            child: Builder(
              builder: (context) {
                if (state.accessDenied) {
                  return const AppEmpty(message: 'Access denied.');
                }
                if (state.isLoading) {
                  return const AppLoading(
                    message: 'Loading tools…',
                  );
                }
                if (state.errorMessage != null && state.items.isEmpty) {
                  return AppErrorView(
                    message: state.errorMessage!,
                    onRetry: () => ref
                        .read(adminToolsControllerProvider.notifier)
                        .refresh(),
                  );
                }
                if (state.items.isEmpty) {
                  return const AppEmpty(message: 'No tools found.');
                }
                return RefreshIndicator(
                  onRefresh: () => ref
                      .read(adminToolsControllerProvider.notifier)
                      .refresh(),
                  child: ListView.builder(
                    controller: _scroll,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: state.items.length +
                        (state.isLoadingMore ? 1 : 0),
                    itemBuilder: (context, i) {
                      if (i >= state.items.length) {
                        return const Padding(
                          padding: EdgeInsets.all(16),
                          child:
                              Center(child: CircularProgressIndicator()),
                        );
                      }
                      final tool = state.items[i];
                      return ListTile(
                        title: Text(tool.name),
                        subtitle: Text(tool.slug),
                        trailing: tool.isActive
                            ? const Chip(label: Text('Active'))
                            : const Chip(label: Text('Off')),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
