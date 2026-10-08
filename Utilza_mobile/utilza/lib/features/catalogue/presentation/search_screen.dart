// Catalogue search: live results as 3D cards, local recent searches,
// branded empty/error states.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../core/constants/analytics_events.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/models/models.dart';
import '../../../core/storage/recent_searches.dart';
import '../../../core/widgets/common.dart';
import '../../../design/app_colors.dart';
import '../../../design/app_tokens.dart';
import '../../../design/widgets/app_search_bar.dart';
import '../../../design/widgets/empty_state.dart';
import '../../../design/widgets/skeleton_loader.dart';
import '../../../design/widgets/tool_card_3d.dart';
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
  List<String> _recent = [];

  @override
  void initState() {
    super.initState();
    getRecentSearches().then((r) {
      if (mounted) setState(() => _recent = r);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search([String? raw]) async {
    final q = (raw ?? _controller.text).trim();
    if (q.isEmpty) {
      setState(() {
        _items = [];
        _searched = false;
        _error = null;
      });
      return;
    }
    _controller.text = q;
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
      await saveRecentSearch(q);
      if (mounted) {
        setState(() {
          _items = res.items;
          _page = res.page;
          _total = res.total;
          _loading = false;
        });
        getRecentSearches().then((r) {
          if (mounted) setState(() => _recent = r);
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e;
        });
      }
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
      if (mounted) {
        setState(() {
          for (final t in res.items) {
            if (seen.add(t.id)) _items.add(t);
          }
          _page = res.page;
          _total = res.total;
          _loadingMore = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingMore = false;
          _error = e;
        });
      }
    }
  }

  void _open(Tool tool) {
    context.push(AppRoutes.toolWith(tool.slug), extra: tool);
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColorScheme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Search')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: AppSearchBar(
              controller: _controller,
              autofocus: true,
              onSubmitted: _search,
              onChanged: (_) {},
            ),
          ),
          if (!_searched && _recent.isNotEmpty)
            SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _recent.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, i) => ActionChip(
                  avatar: const Icon(Icons.history, size: 16),
                  label: Text(_recent[i]),
                  onPressed: () => _search(_recent[i]),
                ),
              ),
            ),
          if (_searched && _total > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '$_total result${_total == 1 ? '' : 's'}',
                  style:
                      AppBrand.caption.copyWith(color: c.textMuted),
                ),
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
                padding: const EdgeInsets.all(16),
                children: [
                  if (_loading)
                    for (var i = 0; i < 4; i++) ...[
                      const SkeletonCard(),
                      const SizedBox(height: 12),
                    ]
                  else if (_error != null && _items.isEmpty)
                    AppErrorView(
                      message: _error is ApiException
                          ? ErrorMapper.userMessage(_error as ApiException)
                          : 'Search failed.',
                      onRetry: () => _search(),
                    )
                  else if (!_searched)
                    EmptyState(
                      title: 'Type to search tools.',
                      detail: _recent.isEmpty
                          ? 'Try “pdf” or “image”.'
                          : 'Or pick a recent search above.',
                      icon: Icons.search_outlined,
                    )
                  else if (_items.isEmpty)
                    EmptyState(
                      title: 'No tools match your search.',
                      detail: 'Try another search or browse categories.',
                      icon: Icons.search_off_outlined,
                      actionLabel: 'Browse all tools',
                      onAction: () => context.push(AppRoutes.home),
                    )
                  else ...[
                    for (final tool in _items) ...[
                      ToolCard3D(
                        tool: tool,
                        heroTag: 'tool-${tool.id}',
                        onTap: () => _open(tool),
                      ),
                      const SizedBox(height: 12),
                    ],
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
