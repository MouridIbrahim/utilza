import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/analytics_events.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/models/models.dart';
import '../../../core/network/providers.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../auth/presentation/auth_providers.dart';
import '../../catalogue/presentation/catalogue_providers.dart';
import '../../history/presentation/history_providers.dart';
import '../data/url_tool_datasource.dart';
import '../domain/url_tool_config.dart';
import 'json_result_view.dart';

final urlToolDataSourceProvider = Provider<UrlToolDataSource>((ref) {
  return UrlToolDataSource(ref.watch(apiClientProvider));
});

/// JSON executor for URL tools (status/metadata/dns/ssl).
/// No file picker, no multipart — a single text input.
class UrlExecutorScreen extends ConsumerStatefulWidget {
  const UrlExecutorScreen({
    super.key,
    required this.tool,
    required this.config,
  });
  final Tool tool;
  final UrlToolConfig config;

  @override
  ConsumerState<UrlExecutorScreen> createState() =>
      _UrlExecutorScreenState();
}

class _UrlExecutorScreenState extends ConsumerState<UrlExecutorScreen> {
  final _form = GlobalKey<FormState>();
  final _input = TextEditingController();
  bool _running = false;
  Object? _result;
  String? _error;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_running) return;
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _running = true;
      _error = null;
      _result = null;
    });
    final value = _input.text.trim();
    try {
      final result = await ref
          .read(urlToolDataSourceProvider)
          .run(widget.config, value);
      ref.read(analyticsProvider).logEvent(
            AnalyticsEvents.toolCompleted,
            toolSlug: widget.tool.slug,
          );
      if (ref.read(authControllerProvider).isAuthenticated) {
        await ref.read(historyControllerProvider.notifier).record(
              widget.tool.slug,
              inputSummary: value.length > 500
                  ? value.substring(0, 500)
                  : value,
            );
      }
      setState(() => _result = result);
    } on ApiException catch (e) {
      ref.read(analyticsProvider).logEvent(
            AnalyticsEvents.toolFailed,
            toolSlug: widget.tool.slug,
          );
      setState(() => _error = ErrorMapper.userMessage(e));
    } catch (_) {
      ref.read(analyticsProvider).logEvent(
            AnalyticsEvents.toolFailed,
            toolSlug: widget.tool.slug,
          );
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _running = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tool = widget.tool;
    final config = widget.config;
    return Scaffold(
      appBar: AppBar(title: Text(tool.name)),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(tool.description),
                const SizedBox(height: 16),
                Form(
            key: _form,
            child: TextFormField(
              controller: _input,
              decoration: InputDecoration(
                labelText: config.inputLabel,
                hintText: config.inputHint,
              ),
              keyboardType: TextInputType.url,
              validator: config.validate,
              enabled: !_running,
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _running ? null : _submit,
            child: _running
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Run'),
          ),
          if (_running) ...[
            const SizedBox(height: 12),
            const AppLoading(message: 'Checking…'),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            AppErrorView(message: _error!, onRetry: _submit),
          ],
          if (_result != null) ...[
            const SizedBox(height: 16),
            _UrlResultView(
              tool: tool,
              config: config,
              result: _result!,
            ),
            TextButton(
              onPressed: () => setState(() {
                _result = null;
                _error = null;
              }),
              child: const Text('Run again'),
            ),
          ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _UrlResultView extends ConsumerWidget {
  const _UrlResultView({
    required this.tool,
    required this.config,
    required this.result,
  });
  final Tool tool;
  final UrlToolConfig config;
  final Object result;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final res = result;
    final body = switch (config.kind) {
      UrlToolKind.status when res is UrlStatusResult =>
        _pairs(res.pairs()),
      UrlToolKind.metadata when res is UrlMetadataResult =>
        _metadataCard(res),
      UrlToolKind.dns when res is DnsResult =>
        _pairs(res.pairs()),
      UrlToolKind.ssl when res is SslResult =>
        _pairs(res.pairs()),
      _ => JsonResultView(
          data: res is Map<String, dynamic>
              ? res
              : {'value': '$res'},
        ),
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Result'),
            const SizedBox(height: 8),
            body,
            const SizedBox(height: 12),
            OutlinedButton.icon(
              icon: const Icon(Icons.copy),
              label: const Text('Copy result'),
              onPressed: () async {
                await Clipboard.setData(
                  ClipboardData(text: result.toString()),
                );
                ref.read(analyticsProvider).logEvent(
                      AnalyticsEvents.resultCopied,
                      toolSlug: tool.slug,
                    );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Copied.')),
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _pairs(List<MapEntry<String, String>> pairs) {
    return Column(
      children: [
        for (final p in pairs)
          ListTile(
            dense: true,
            title: Text(p.key),
            subtitle: SelectableText(p.value),
          ),
      ],
    );
  }

  Widget _metadataCard(UrlMetadataResult result) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (result.title != null) Text('Title: ${result.title}'),
        if (result.description != null)
          Text('Description: ${result.description}'),
        if (result.openGraph != null) ...[
          const SizedBox(height: 8),
          JsonResultView(data: result.openGraph!),
        ],
      ],
    );
  }
}

extension on UrlStatusResult {
  List<MapEntry<String, String>> pairs() => [
        MapEntry('URL', url),
        MapEntry('OK', '$ok'),
        if (status != null) MapEntry('Status', '$status'),
        if (finalUrl != null) MapEntry('Final URL', finalUrl!),
        MapEntry('Redirects', '$redirectCount'),
        if (redirects.any((r) => r.isNotEmpty))
          MapEntry('Chain', redirects.where((r) => r.isNotEmpty).join(' → ')),
        if (contentType != null) MapEntry('Content-Type', contentType!),
        if (size != null) MapEntry('Size', '$size'),
      ];
}

extension on DnsResult {
  List<MapEntry<String, String>> pairs() => [
        MapEntry('Domain', domain),
        if (a.isNotEmpty) MapEntry('A', a.join(', ')),
        if (aaaa.isNotEmpty) MapEntry('AAAA', aaaa.join(', ')),
        if (mx.isNotEmpty) MapEntry('MX', mx.join(', ')),
        if (txt.isNotEmpty) MapEntry('TXT', txt.join(', ')),
        if (ns.isNotEmpty) MapEntry('NS', ns.join(', ')),
      ];
}

extension on SslResult {
  List<MapEntry<String, String>> pairs() => [
        MapEntry('Domain', domain),
        if (subject != null) MapEntry('Subject', subject!),
        if (issuer != null) MapEntry('Issuer', issuer!),
        if (validFrom != null) MapEntry('Valid from', validFrom!),
        if (validTo != null) MapEntry('Valid to', validTo!),
        if (daysLeft != null) MapEntry('Days left', '$daysLeft'),
        if (fingerprint256 != null)
          MapEntry('Fingerprint', fingerprint256!),
      ];
}
