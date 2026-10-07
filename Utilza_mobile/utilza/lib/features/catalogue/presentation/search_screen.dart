import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../core/constants/analytics_events.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/models/models.dart';
import '../../../core/widgets/common.dart';
import 'catalogue_providers.dart';

/// Catalogue search. Fires `search_performed` (fire-and-forget, no PII).
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  List<Tool> _items = [];
  int _page = 1;
  int _total = 0;
  bool _loading = false;
  bool _loadingMore = false;
  bool _searched = false;
  Object? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final q = _controller.text.trim();
    if (q.isEmpty) {
      setState(() {
        _items = [];
        _searched = false;
        _error = null;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _searched = true;
    });
    ref.read(analyticsProvider).logEvent(AnalyticsEvents.searchPerformed);
    try {
      final res = await ref.read(catalogueRepositoryProvider).getTools(
            search: q,
            page: 1,
            limit: 20,
          );
      setState(() {
        _items = res.items;
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
            search: _controller.text.trim(),
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
      appBar: AppBar(title: const Text('Search')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _controller,
              decoration: InputDecoration(
                labelText: 'Search tools',
                suffixIcon: IconButton(
                  icon: const Icon(Icons.search),
                  onPressed: _search,
                ),
              ),
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _search(),
            ),
          ),
          Expanded(
            child: NotificationListener<ScrollNotification>(
              onNotification: (n) {
                if (n.metrics.pixels >= n.metrics.maxScrollExtent - 300) {
                  _loadMore();
                }
                return false;
              },
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  if (_loading)
                    const AppLoading(message: 'Searching…')
                  else if (_error != null && _items.isEmpty)
                    AppErrorView(
                      message: _error is ApiException
                          ? ErrorMapper.userMessage(_error as ApiException)
                          : 'Search failed.',
                      onRetry: _search,
                    )
                  else if (!_searched)
                    const AppEmpty(message: 'Type to search tools.')
                  else if (_items.isEmpty)
                    const AppEmpty(
                      message: 'No tools match your search.',
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
                        child:
                            Center(child: CircularProgressIndicator()),
                      ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
