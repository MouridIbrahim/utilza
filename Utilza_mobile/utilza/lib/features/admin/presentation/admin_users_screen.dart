import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common.dart';
import 'admin_providers.dart';

/// Optional read-only admin users list. Access is decided by the
/// backend: 403 FORBIDDEN hides the list. No mutations exposed.
class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() =>
      _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  final _search = TextEditingController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    Future.microtask(
      () => ref.read(adminUsersControllerProvider.notifier).loadFirst(),
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
      ref.read(adminUsersControllerProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminUsersControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Admin users')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _search,
              decoration: InputDecoration(
                labelText: 'Search users',
                suffixIcon: IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: () => ref
                      .read(adminUsersControllerProvider.notifier)
                      .loadFirst(search: _search.text),
                ),
              ),
              textInputAction: TextInputAction.search,
              onSubmitted: (v) => ref
                  .read(adminUsersControllerProvider.notifier)
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
                    message: 'Loading users…',
                  );
                }
                if (state.errorMessage != null && state.items.isEmpty) {
                  return AppErrorView(
                    message: state.errorMessage!,
                    onRetry: () => ref
                        .read(adminUsersControllerProvider.notifier)
                        .refresh(),
                  );
                }
                if (state.items.isEmpty) {
                  return const AppEmpty(message: 'No users found.');
                }
                return RefreshIndicator(
                  onRefresh: () => ref
                      .read(adminUsersControllerProvider.notifier)
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
                      final user = state.items[i];
                      return ListTile(
                        title: Text(user.email),
                        subtitle: user.name != null
                            ? Text(user.name!)
                            : null,
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
