import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/widgets/common.dart';
import 'favorite_providers.dart';

/// Authenticated favorites. Uses tool `id` for mutations, never the slug.
class FavoritesScreen extends ConsumerStatefulWidget {
  const FavoritesScreen({super.key});

  @override
  ConsumerState<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends ConsumerState<FavoritesScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(favoritesControllerProvider.notifier).load(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(favoritesControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Favorites')),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(favoritesControllerProvider.notifier).refresh(),
        child: Builder(
          builder: (context) {
            if (state.isLoading) {
              return const AppLoading(message: 'Loading favorites…');
            }
            if (state.errorMessage != null && state.items.isEmpty) {
              return AppErrorView(
                message: state.errorMessage!,
                onRetry: () => ref
                    .read(favoritesControllerProvider.notifier)
                    .refresh(),
              );
            }
            if (state.items.isEmpty) {
              return const AppEmpty(
                message: 'No favorite tools yet.',
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.items.length,
              itemBuilder: (context, i) {
                final fav = state.items[i];
                final tool = fav.tool;
                return Dismissible(
                  key: ValueKey(fav.id),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    color: Theme.of(context).colorScheme.error,
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 16),
                    child: const Icon(Icons.delete, color: Colors.white),
                  ),
                  onDismissed: (_) async {
                    try {
                      await ref
                          .read(favoritesControllerProvider.notifier)
                          .remove(fav.toolId);
                    } on ApiException catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(ErrorMapper.userMessage(e)),
                          ),
                        );
                      }
                    }
                  },
                  child: Card(
                    child: ListTile(
                      title: Text(tool?.name ?? fav.toolId),
                      subtitle:
                          tool != null ? Text(tool.slug) : null,
                      trailing: const Icon(Icons.chevron_right),
                      onTap: tool == null
                          ? null
                          : () => context.push(
                                AppRoutes.toolWith(tool.slug),
                              ),
                    ),
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
