import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/models/models.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../catalogue/presentation/catalogue_providers.dart';

/// Category detail + tools in that exact category slug.
class CategoryScreen extends ConsumerStatefulWidget {
  const CategoryScreen({super.key, required this.slug});
  final String slug;

  @override
  ConsumerState<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends ConsumerState<CategoryScreen> {
  final List<Tool> _items = [];
  int _page = 1;
  int _total = 0;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadFirst);
  }

  Future<void> _loadFirst() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref.read(catalogueRepositoryProvider).getTools(
            category: widget.slug,
            page: 1,
            limit: 20,
          );
      setState(() {
        _items
          ..clear()
          ..addAll(res.items);
        _page = res.page;
        _total = res.total;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loading || _loadingMore || _items.length >= _total) return;
    setState(() => _loadingMore = true);
    try {
      final res = await ref.read(catalogueRepositoryProvider).getTools(
            category: widget.slug,
            page: _page + 1,
            limit: 20,
          );
      final seen = _items.map((t) => t.id).toSet();
      setState(() {
        for (final t in res.items) {
          if (seen.add(t.id)) _items.add(t);
        }
        _page = res.page;
        _total = res.total;
        _loadingMore = false;
      });
    } catch (e) {
      setState(() {
        _loadingMore = false;
        _error = e;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.slug)),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadFirst,
              child: NotificationListener<ScrollNotification>(
                onNotification: (n) {
                  if (n.metrics.pixels >=
                      n.metrics.maxScrollExtent - 300) {
                    _loadMore();
                  }
                  return false;
                },
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
              if (_loading)
                const AppLoading(message: 'Loading category…')
              else if (_error != null && _items.isEmpty)
                AppErrorView(
                  message: _error is ApiException
                      ? ErrorMapper.userMessage(_error as ApiException)
                      : 'Failed to load.',
                  onRetry: _loadFirst,
                )
              else if (_items.isEmpty)
                const AppEmpty(
                  message: 'No tools available in this category.',
                )
              else ...[
                for (final tool in _items)
                  Card(
                    child: ListTile(
                      title: Text(tool.name),
                      subtitle: Text(
                        tool.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () => context.push(
                        AppRoutes.toolWith(tool.slug),
                        extra: tool,
                      ),
                    ),
                  ),
                if (_loadingMore)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(child: CircularProgressIndicator()),
                  ),
              ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
