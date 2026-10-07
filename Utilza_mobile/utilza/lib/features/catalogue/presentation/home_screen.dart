import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/models/models.dart';
import '../../../core/widgets/common.dart';
import '../../auth/presentation/auth_providers.dart';
import '../../categories/presentation/category_providers.dart';
import 'catalogue_providers.dart';

/// Public catalogue home: categories + paginated tools.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    Future.microtask(
      () => ref.read(toolsControllerProvider.notifier).loadFirst(),
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
      ref.read(toolsControllerProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final tools = ref.watch(toolsControllerProvider);
    final categories = ref.watch(categoriesProvider);
    final authed = ref.watch(
      authControllerProvider.select((s) => s.isAuthenticated),
    );
    return Scaffold(
      appBar: AppBar(
        title: const Text('Utilza'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => context.push(AppRoutes.search),
          ),
          IconButton(
            icon: Icon(authed ? Icons.account_circle : Icons.login),
            onPressed: () => context.push(
              authed ? AppRoutes.profile : AppRoutes.login,
            ),
          ),
        ],
      ),
      drawer: _HomeDrawer(authed: authed),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(toolsControllerProvider.notifier).refresh(),
        child: ListView(
          controller: _scroll,
          padding: const EdgeInsets.all(16),
          children: [
            Text('Categories', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            _CategoriesRow(categories: categories),
            const SizedBox(height: 16),
            Text('Tools', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (tools.isLoading)
              const AppLoading(message: 'Loading tools…')
            else if (tools.errorMessage != null && tools.items.isEmpty)
              AppErrorView(
                message: _friendly(tools.errorMessage!),
                onRetry: () => ref
                    .read(toolsControllerProvider.notifier)
                    .refresh(),
              )
            else if (tools.items.isEmpty)
              const AppEmpty(message: 'No tools available.')
            else ...[
              for (final tool in tools.items)
                Card(
                  child: ListTile(
                    leading: tool.icon?.isNotEmpty == true
                        ? Text(tool.icon!,
                            style: const TextStyle(fontSize: 24))
                        : const Icon(Icons.build),
                    title: Text(tool.name),
                    subtitle: Text(
                      tool.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: tool.isFrontend
                        ? const Chip(label: Text('Local'))
                        : null,
                    onTap: () => context.push(
                      AppRoutes.toolWith(tool.slug),
                      extra: tool,
                    ),
                  ),
                ),
              if (tools.isLoadingMore)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (tools.hasMore)
                TextButton(
                  onPressed: () => ref
                      .read(toolsControllerProvider.notifier)
                      .loadMore(),
                  child: const Text('Load more'),
                ),
            ],
          ],
        ),
      ),
    );
  }

  String _friendly(String raw) {
    // Controller stores e.toString(); map ApiException when possible.
    return raw;
  }
}

class _CategoriesRow extends ConsumerWidget {
  const _CategoriesRow({required this.categories});
  final AsyncValue<List<Category>> categories;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return categories.when(
      loading: () => const SizedBox(
        height: 40,
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => TextButton(
        onPressed: () => ref.invalidate(categoriesProvider),
        child: Text(
          e is ApiException ? ErrorMapper.userMessage(e) : 'Failed to load.',
        ),
      ),
      data: (list) {
        if (list.isEmpty) {
          return const AppEmpty(message: 'No categories yet.');
        }
        return Wrap(
          spacing: 8,
          children: [
            for (final c in list)
              ActionChip(
                label: Text(c.name),
                onPressed: () => context.push(
                  AppRoutes.categoryWith(c.slug),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _HomeDrawer extends ConsumerWidget {
  const _HomeDrawer({required this.authed});
  final bool authed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Drawer(
      child: ListView(
        children: [
          const DrawerHeader(child: Text('Utilza')),
          ListTile(
            leading: const Icon(Icons.home),
            title: const Text('Home'),
            onTap: () => context.go(AppRoutes.home),
          ),
          ListTile(
            leading: const Icon(Icons.search),
            title: const Text('Search'),
            onTap: () => context.push(AppRoutes.search),
          ),
          ListTile(
            leading: const Icon(Icons.favorite),
            title: const Text('Favorites'),
            onTap: () => context.push(AppRoutes.favorites),
          ),
          ListTile(
            leading: const Icon(Icons.history),
            title: const Text('History'),
            onTap: () => context.push(AppRoutes.history),
          ),
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Profile'),
            onTap: () => context.push(AppRoutes.profile),
          ),
          ListTile(
            leading: const Icon(Icons.card_membership),
            title: const Text('Subscription'),
            onTap: () => context.push(AppRoutes.subscription),
          ),
          const Divider(),
          if (authed)
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Logout'),
              onTap: () async {
                await ref.read(authControllerProvider.notifier).logout();
                if (context.mounted) context.go(AppRoutes.home);
              },
            )
          else ...[
            ListTile(
              leading: const Icon(Icons.login),
              title: const Text('Login'),
              onTap: () => context.push(AppRoutes.login),
            ),
            ListTile(
              leading: const Icon(Icons.person_add),
              title: const Text('Register'),
              onTap: () => context.push(AppRoutes.register),
            ),
          ],
        ],
      ),
    );
  }
}
