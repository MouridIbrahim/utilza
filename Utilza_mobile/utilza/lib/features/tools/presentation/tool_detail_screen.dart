import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../core/constants/analytics_events.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/models/models.dart';
import '../../../core/widgets/common.dart';
import '../../../design/icon_mapper.dart';
import '../../../design/widgets/icon_tile.dart';
import '../../catalogue/presentation/catalogue_providers.dart';

class _DetailIcon extends StatelessWidget {
  const _DetailIcon({required this.tool});
  final Tool tool;

  @override
  Widget build(BuildContext context) {
    return IconTile(
      icon: toolIconFor(
        iconKey: tool.icon,
        categorySlug: tool.category?.slug,
      ),
      categorySlug: tool.category?.slug,
      size: 56,
      semanticLabel: '${tool.name} icon',
    );
  }
}

/// Tool detail. Routes by `implementation`: frontend → local executor
/// (Phase 7), backend → backend executor (Phase 8). Never derives an
/// endpoint from the slug. List navigation passes the Tool via extra;
/// deep links resolve via catalogue search for an exact slug match.
class ToolDetailScreen extends ConsumerStatefulWidget {
  const ToolDetailScreen({super.key, required this.slug, this.initial});
  final String slug;
  final Tool? initial;

  @override
  ConsumerState<ToolDetailScreen> createState() => _ToolDetailScreenState();
}

class _ToolDetailScreenState extends ConsumerState<ToolDetailScreen> {
  bool _logged = false;

  void _logOpen(String slug) {
    if (_logged) return;
    _logged = true;
    ref
        .read(analyticsProvider)
        .logEvent(AnalyticsEvents.toolOpened, toolSlug: slug);
  }

  @override
  Widget build(BuildContext context) {
    final initial = widget.initial;
    if (initial != null) {
      _logOpen(initial.slug);
      return _DetailBody(tool: initial);
    }
    final async = ref.watch(toolBySlugProvider(widget.slug));
    return async.when(
      loading: () => Scaffold(
        appBar: AppBar(title: Text(widget.slug)),
        body: const AppLoading(message: 'Loading tool…'),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: Text(widget.slug)),
        body: AppErrorView(
          message: e is ApiException
              ? ErrorMapper.userMessage(e)
              : 'Tool unavailable.',
          onRetry: () => ref.invalidate(toolBySlugProvider(widget.slug)),
        ),
      ),
      data: (tool) {
        if (tool == null) {
          return Scaffold(
            appBar: AppBar(title: Text(widget.slug)),
            body: const AppEmpty(message: 'Tool unavailable.'),
          );
        }
        _logOpen(tool.slug);
        return _DetailBody(tool: tool);
      },
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.tool});
  final Tool tool;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(tool.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Hero(
            tag: 'tool-${tool.id}',
            child: Material(
              type: MaterialType.transparency,
              child: _DetailIcon(tool: tool),
            ),
          ),
          const SizedBox(height: 12),
          Text(tool.description),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            children: [
              Chip(label: Text(tool.category?.name ?? 'Tools')),
              Chip(
                label: Text(tool.isFrontend ? 'Local' : 'Online'),
              ),
              if (tool.requiresAuth) const Chip(label: Text('Login needed')),
              if (tool.supportsOffline)
                const Chip(label: Text('Offline OK')),
            ],
          ),
          const SizedBox(height: 24),
          if (tool.isFrontend) ...[
            const Text(
              'This is an on-device tool. No data leaves your phone.',
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context.push(
                AppRoutes.localWith(tool.slug),
                extra: tool,
              ),
              child: const Text('Open local tool'),
            ),
          ] else ...[
            const Text('This tool runs on the Utilza server.'),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context.push(
                AppRoutes.runWith(tool.slug),
                extra: tool,
              ),
              child: const Text('Open tool'),
            ),
          ],
        ],
      ),
    );
  }
}
