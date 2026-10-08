import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/constants/analytics_events.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/models/models.dart';
import '../../../core/widgets/common.dart';
import '../../auth/presentation/auth_providers.dart';
import '../../catalogue/presentation/catalogue_providers.dart';
import '../../history/presentation/history_providers.dart';
import '../data/local_tools.dart';
import '../domain/local_tool.dart';
import '../domain/local_tool_registry.dart';

/// On-device executor for `implementation == "frontend"` tools.
/// Pure local computation: no HTTP, no fake API calls. History is
/// recorded only through the real POST /history endpoint (when
/// authenticated); analytics use the allowlisted names.
class LocalExecutorScreen extends ConsumerWidget {
  const LocalExecutorScreen({super.key, required this.slug, this.initial});
  final String slug;
  final Tool? initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final initial = this.initial;
    if (initial != null) return _Resolved(tool: initial);
    final async = ref.watch(toolBySlugProvider(slug));
    return async.when(
      loading: () => Scaffold(
        appBar: AppBar(title: Text(slug)),
        body: const AppLoading(message: 'Loading tool…'),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: Text(slug)),
        body: AppErrorView(
          message: e is ApiException
              ? ErrorMapper.userMessage(e)
              : 'Tool unavailable.',
          onRetry: () => ref.invalidate(toolBySlugProvider(slug)),
        ),
      ),
      data: (tool) {
        if (tool == null) {
          return Scaffold(
            appBar: AppBar(title: Text(slug)),
            body: const AppEmpty(message: 'Tool unavailable.'),
          );
        }
        return _Resolved(tool: tool);
      },
    );
  }
}

class _Resolved extends ConsumerWidget {
  const _Resolved({required this.tool});
  final Tool tool;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (tool.isBackend) {
      // Misroute guard: backend tools must use the backend executor.
      return Scaffold(
        appBar: AppBar(title: Text(tool.name)),
        body: const AppEmpty(
          message: 'This tool runs on the server. Use the online executor.',
        ),
      );
    }
    final kind = LocalToolRegistry.resolve(tool);
    return Scaffold(
      appBar: AppBar(title: Text(tool.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(tool.description),
          const SizedBox(height: 8),
          const Text(
            'Runs on-device. No data leaves your phone.',
            style: TextStyle(fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 16),
          switch (kind) {
            LocalToolKind.wordCounter =>
              _WordCounterSection(tool: tool),
            LocalToolKind.caseConverter =>
              _CaseConverterSection(tool: tool),
            LocalToolKind.jsonFormatter =>
              _JsonFormatterSection(tool: tool),
            LocalToolKind.urlCodec => _UrlCodecSection(tool: tool),
            LocalToolKind.base64Text =>
              _Base64Section(tool: tool),
            LocalToolKind.percentage =>
              _PercentageSection(tool: tool),
            LocalToolKind.discount =>
              _DiscountSection(tool: tool),
            LocalToolKind.age => _AgeSection(tool: tool),
            LocalToolKind.dateDiff =>
              _DateDiffSection(tool: tool),
            LocalToolKind.unitConverter =>
              _UnitSection(tool: tool),
            LocalToolKind.password =>
              _PasswordSection(tool: tool),
            LocalToolKind.qr => _QrSection(tool: tool),
            null => const AppEmpty(
                message:
                    'On-device implementation for this tool is coming soon.',
              ),
          },
        ],
      ),
    );
  }
}

/// Shared post-run hook: analytics + explicit history record.
/// Never includes raw input text in the summary.
Future<void> _afterRun(
  WidgetRef ref, {
  required Tool tool,
  required LocalToolResult result,
}) async {
  ref
      .read(analyticsProvider)
      .logEvent(AnalyticsEvents.toolCompleted, toolSlug: tool.slug);
  if (ref.read(authControllerProvider).isAuthenticated) {
    await ref
        .read(historyControllerProvider.notifier)
        .record(tool.slug, inputSummary: result.summary);
  }
}

Future<void> _afterFailure(WidgetRef ref, {required Tool tool}) async {
  ref
      .read(analyticsProvider)
      .logEvent(AnalyticsEvents.toolFailed, toolSlug: tool.slug);
}

class _ResultView extends ConsumerWidget {
  const _ResultView({
    required this.tool,
    required this.result,
    this.error,
  });
  final Tool tool;
  final LocalToolResult? result;
  final String? error;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (error != null) {
      return AppErrorView(message: error!);
    }
    if (result == null) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SelectableText(result!.output),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              icon: const Icon(Icons.copy),
              label: const Text('Copy result'),
              onPressed: () async {
                await Clipboard.setData(
                  ClipboardData(text: result!.output),
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
}

class _WordCounterSection extends ConsumerStatefulWidget {
  const _WordCounterSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_WordCounterSection> createState() =>
      _WordCounterSectionState();
}

class _WordCounterSectionState
    extends ConsumerState<_WordCounterSection> {
  final _input = TextEditingController();
  LocalToolResult? _result;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _run() {
    final result = WordCounter.count(_input.text);
    setState(() => _result = result);
    _afterRun(ref, tool: widget.tool, result: result);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _input,
          decoration: const InputDecoration(
            labelText: 'Text to analyze',
            border: OutlineInputBorder(),
          ),
          maxLines: 6,
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Count')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result),
      ],
    );
  }
}

class _CaseConverterSection extends ConsumerStatefulWidget {
  const _CaseConverterSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_CaseConverterSection> createState() =>
      _CaseConverterSectionState();
}

class _CaseConverterSectionState
    extends ConsumerState<_CaseConverterSection> {
  final _input = TextEditingController();
  LocalToolResult? _result;
  String _mode = 'upper';

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _run() {
    final input = _input.text;
    final output = switch (_mode) {
      'lower' => CaseConverter.lower(input),
      'title' => CaseConverter.title(input),
      _ => CaseConverter.upper(input),
    };
    final result = LocalToolResult(
      summary: 'case-converter: $_mode ${input.length} chars',
      output: output,
    );
    setState(() => _result = result);
    _afterRun(ref, tool: widget.tool, result: result);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _input,
          decoration: const InputDecoration(
            labelText: 'Text to convert',
            border: OutlineInputBorder(),
          ),
          maxLines: 5,
        ),
        const SizedBox(height: 12),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: 'upper', label: Text('UPPER')),
            ButtonSegment(value: 'lower', label: Text('lower')),
            ButtonSegment(value: 'title', label: Text('Title')),
          ],
          selected: {_mode},
          onSelectionChanged: (s) => setState(() => _mode = s.single),
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Convert')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result),
      ],
    );
  }
}

class _JsonFormatterSection extends ConsumerStatefulWidget {
  const _JsonFormatterSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_JsonFormatterSection> createState() =>
      _JsonFormatterSectionState();
}

class _JsonFormatterSectionState
    extends ConsumerState<_JsonFormatterSection> {
  final _input = TextEditingController();
  LocalToolResult? _result;
  String? _error;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _run() {
    try {
      final result = JsonFormatter.format(_input.text);
      setState(() {
        _result = result;
        _error = null;
      });
      _afterRun(ref, tool: widget.tool, result: result);
    } on FormatException catch (e) {
      setState(() {
        _result = null;
        _error = e.message;
      });
      _afterFailure(ref, tool: widget.tool);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _input,
          decoration: const InputDecoration(
            labelText: 'JSON input',
            border: OutlineInputBorder(),
          ),
          maxLines: 8,
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Format')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result, error: _error),
      ],
    );
  }
}

class _UrlCodecSection extends ConsumerStatefulWidget {
  const _UrlCodecSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_UrlCodecSection> createState() => _UrlCodecSectionState();
}

class _UrlCodecSectionState extends ConsumerState<_UrlCodecSection> {
  final _input = TextEditingController();
  LocalToolResult? _result;
  String? _error;
  String _mode = 'encode';

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _run() {
    try {
      final result = _mode == 'encode'
          ? UrlCodec.encode(_input.text)
          : UrlCodec.decode(_input.text);
      setState(() {
        _result = result;
        _error = null;
      });
      _afterRun(ref, tool: widget.tool, result: result);
    } on FormatException catch (e) {
      setState(() {
        _result = null;
        _error = e.message;
      });
      _afterFailure(ref, tool: widget.tool);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _input,
          decoration: const InputDecoration(
            labelText: 'URL / text',
            border: OutlineInputBorder(),
          ),
          maxLines: 4,
        ),
        const SizedBox(height: 12),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: 'encode', label: Text('Encode')),
            ButtonSegment(value: 'decode', label: Text('Decode')),
          ],
          selected: {_mode},
          onSelectionChanged: (s) => setState(() => _mode = s.single),
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Run')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result, error: _error),
      ],
    );
  }
}

class _Base64Section extends ConsumerStatefulWidget {
  const _Base64Section({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_Base64Section> createState() => _Base64SectionState();
}

class _Base64SectionState extends ConsumerState<_Base64Section> {
  final _input = TextEditingController();
  LocalToolResult? _result;
  String? _error;
  String _mode = 'encode';

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _run() {
    try {
      final result = _mode == 'encode'
          ? Base64Text.encode(_input.text)
          : Base64Text.decode(_input.text);
      setState(() {
        _result = result;
        _error = null;
      });
      _afterRun(ref, tool: widget.tool, result: result);
    } on FormatException catch (e) {
      setState(() {
        _result = null;
        _error = e.message;
      });
      _afterFailure(ref, tool: widget.tool);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Text only. File Base64 tools run on the server.',
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _input,
          decoration: const InputDecoration(
            labelText: 'Text / Base64',
            border: OutlineInputBorder(),
          ),
          maxLines: 5,
        ),
        const SizedBox(height: 12),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment(value: 'encode', label: Text('Encode')),
            ButtonSegment(value: 'decode', label: Text('Decode')),
          ],
          selected: {_mode},
          onSelectionChanged: (s) => setState(() => _mode = s.single),
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Run')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result, error: _error),
      ],
    );
  }
}

double? _parseNumber(String raw) => double.tryParse(raw.trim());

class _PercentageSection extends ConsumerStatefulWidget {
  const _PercentageSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_PercentageSection> createState() =>
      _PercentageSectionState();
}

class _PercentageSectionState extends ConsumerState<_PercentageSection> {
  final _value = TextEditingController();
  final _percent = TextEditingController();
  LocalToolResult? _result;
  String? _error;

  @override
  void dispose() {
    _value.dispose();
    _percent.dispose();
    super.dispose();
  }

  void _run() {
    final value = _parseNumber(_value.text);
    final percent = _parseNumber(_percent.text);
    if (value == null || percent == null) {
      setState(() {
        _result = null;
        _error = 'Enter a value and a percentage.';
      });
      return;
    }
    final result = PercentageCalc.compute(value, percent);
    setState(() {
      _result = result;
      _error = null;
    });
    _afterRun(ref, tool: widget.tool, result: result);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _value,
          decoration: const InputDecoration(labelText: 'Value'),
          keyboardType:
              const TextInputType.numberWithOptions(decimal: true),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _percent,
          decoration: const InputDecoration(labelText: 'Percent (%)'),
          keyboardType:
              const TextInputType.numberWithOptions(decimal: true),
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Calculate')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result, error: _error),
      ],
    );
  }
}

class _DiscountSection extends ConsumerStatefulWidget {
  const _DiscountSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_DiscountSection> createState() => _DiscountSectionState();
}

class _DiscountSectionState extends ConsumerState<_DiscountSection> {
  final _price = TextEditingController();
  final _percent = TextEditingController();
  LocalToolResult? _result;
  String? _error;

  @override
  void dispose() {
    _price.dispose();
    _percent.dispose();
    super.dispose();
  }

  void _run() {
    final price = _parseNumber(_price.text);
    final percent = _parseNumber(_percent.text);
    if (price == null || percent == null) {
      setState(() {
        _result = null;
        _error = 'Enter a price and a discount.';
      });
      return;
    }
    try {
      final result = DiscountCalc.compute(price, percent);
      setState(() {
        _result = result;
        _error = null;
      });
      _afterRun(ref, tool: widget.tool, result: result);
    } on FormatException catch (e) {
      setState(() {
        _result = null;
        _error = e.message;
      });
      _afterFailure(ref, tool: widget.tool);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _price,
          decoration: const InputDecoration(labelText: 'Original price'),
          keyboardType:
              const TextInputType.numberWithOptions(decimal: true),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _percent,
          decoration: const InputDecoration(labelText: 'Discount (%)'),
          keyboardType:
              const TextInputType.numberWithOptions(decimal: true),
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Calculate')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result, error: _error),
      ],
    );
  }
}

DateTime? _parseDate(String raw) {
  final match =
      RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(raw.trim());
  if (match == null) return null;
  try {
    return DateTime(
      int.parse(match.group(1)!),
      int.parse(match.group(2)!),
      int.parse(match.group(3)!),
    );
  } catch (_) {
    return null;
  }
}

class _AgeSection extends ConsumerStatefulWidget {
  const _AgeSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_AgeSection> createState() => _AgeSectionState();
}

class _AgeSectionState extends ConsumerState<_AgeSection> {
  final _input = TextEditingController();
  LocalToolResult? _result;
  String? _error;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _run() {
    final birth = _parseDate(_input.text);
    if (birth == null) {
      setState(() {
        _result = null;
        _error = 'Enter a birthdate as YYYY-MM-DD.';
      });
      return;
    }
    try {
      final result = AgeCalc.fromBirthdate(birth);
      setState(() {
        _result = result;
        _error = null;
      });
      _afterRun(ref, tool: widget.tool, result: result);
    } on FormatException catch (e) {
      setState(() {
        _result = null;
        _error = e.message;
      });
      _afterFailure(ref, tool: widget.tool);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _input,
          decoration: const InputDecoration(
            labelText: 'Birthdate (YYYY-MM-DD)',
            hintText: '2000-01-31',
          ),
          keyboardType: TextInputType.datetime,
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Calculate age')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result, error: _error),
      ],
    );
  }
}

class _DateDiffSection extends ConsumerStatefulWidget {
  const _DateDiffSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_DateDiffSection> createState() => _DateDiffSectionState();
}

class _DateDiffSectionState extends ConsumerState<_DateDiffSection> {
  final _first = TextEditingController();
  final _second = TextEditingController();
  LocalToolResult? _result;
  String? _error;

  @override
  void dispose() {
    _first.dispose();
    _second.dispose();
    super.dispose();
  }

  void _run() {
    final a = _parseDate(_first.text);
    final b = _parseDate(_second.text);
    if (a == null || b == null) {
      setState(() {
        _result = null;
        _error = 'Enter both dates as YYYY-MM-DD.';
      });
      return;
    }
    final result = DateDiff.daysBetween(a, b);
    setState(() {
      _result = result;
      _error = null;
    });
    _afterRun(ref, tool: widget.tool, result: result);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _first,
          decoration: const InputDecoration(labelText: 'From (YYYY-MM-DD)'),
          keyboardType: TextInputType.datetime,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _second,
          decoration: const InputDecoration(labelText: 'To (YYYY-MM-DD)'),
          keyboardType: TextInputType.datetime,
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Calculate')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result, error: _error),
      ],
    );
  }
}

class _UnitSection extends ConsumerStatefulWidget {
  const _UnitSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_UnitSection> createState() => _UnitSectionState();
}

class _UnitSectionState extends ConsumerState<_UnitSection> {
  final _input = TextEditingController();
  String _from = 'm';
  String _to = 'ft';
  LocalToolResult? _result;
  String? _error;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _run() {
    final value = _parseNumber(_input.text);
    if (value == null) {
      setState(() {
        _result = null;
        _error = 'Enter a value to convert.';
      });
      return;
    }
    try {
      final result = UnitConverter.convert(value, _from, _to);
      setState(() {
        _result = result;
        _error = null;
      });
      _afterRun(ref, tool: widget.tool, result: result);
    } on FormatException catch (e) {
      setState(() {
        _result = null;
        _error = e.message;
      });
      _afterFailure(ref, tool: widget.tool);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _input,
          decoration: const InputDecoration(labelText: 'Value'),
          keyboardType:
              const TextInputType.numberWithOptions(decimal: true),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                decoration: const InputDecoration(labelText: 'From'),
                initialValue: _from,
                items: [
                  for (final u in UnitConverter.units)
                    DropdownMenuItem(value: u, child: Text(u)),
                ],
                onChanged: (v) => setState(() => _from = v ?? _from),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: DropdownButtonFormField<String>(
                decoration: const InputDecoration(labelText: 'To'),
                initialValue: _to,
                items: [
                  for (final u in UnitConverter.units)
                    DropdownMenuItem(value: u, child: Text(u)),
                ],
                onChanged: (v) => setState(() => _to = v ?? _to),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Convert')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result, error: _error),
      ],
    );
  }
}

class _PasswordSection extends ConsumerStatefulWidget {
  const _PasswordSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_PasswordSection> createState() => _PasswordSectionState();
}

class _PasswordSectionState extends ConsumerState<_PasswordSection> {
  final _length = TextEditingController(text: '16');
  bool _upper = true;
  bool _lower = true;
  bool _digits = true;
  bool _symbols = false;
  LocalToolResult? _result;
  String? _error;

  @override
  void dispose() {
    _length.dispose();
    super.dispose();
  }

  void _run() {
    final length = int.tryParse(_length.text.trim());
    if (length == null) {
      setState(() {
        _result = null;
        _error = 'Enter a password length.';
      });
      return;
    }
    try {
      final result = PasswordGen.generate(
        length: length,
        upper: _upper,
        lower: _lower,
        digits: _digits,
        symbols: _symbols,
      );
      setState(() {
        _result = result;
        _error = null;
      });
      _afterRun(ref, tool: widget.tool, result: result);
    } on FormatException catch (e) {
      setState(() {
        _result = null;
        _error = e.message;
      });
      _afterFailure(ref, tool: widget.tool);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _length,
          decoration: const InputDecoration(labelText: 'Length (4–128)'),
          keyboardType: TextInputType.number,
        ),
        SwitchListTile(
          title: const Text('Uppercase (A–Z)'),
          value: _upper,
          onChanged: (v) => setState(() => _upper = v),
        ),
        SwitchListTile(
          title: const Text('Lowercase (a–z)'),
          value: _lower,
          onChanged: (v) => setState(() => _lower = v),
        ),
        SwitchListTile(
          title: const Text('Digits (0–9)'),
          value: _digits,
          onChanged: (v) => setState(() => _digits = v),
        ),
        SwitchListTile(
          title: const Text('Symbols'),
          value: _symbols,
          onChanged: (v) => setState(() => _symbols = v),
        ),
        FilledButton(onPressed: _run, child: const Text('Generate')),
        const SizedBox(height: 12),
        _ResultView(tool: widget.tool, result: _result, error: _error),
      ],
    );
  }
}

class _QrSection extends ConsumerStatefulWidget {
  const _QrSection({required this.tool});
  final Tool tool;

  @override
  ConsumerState<_QrSection> createState() => _QrSectionState();
}

class _QrSectionState extends ConsumerState<_QrSection> {
  final _input = TextEditingController();
  String? _data;
  String? _error;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _run() {
    final value = _input.text.trim();
    if (value.isEmpty) {
      setState(() {
        _data = null;
        _error = 'Enter text or a URL to encode.';
      });
      return;
    }
    setState(() {
      _data = value;
      _error = null;
    });
    _afterRun(
      ref,
      tool: widget.tool,
      result: LocalToolResult(
        summary: 'qr-generator: ${value.length} chars',
        output: value,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _input,
          decoration: const InputDecoration(
            labelText: 'Text or URL',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        const SizedBox(height: 12),
        FilledButton(onPressed: _run, child: const Text('Generate QR')),
        const SizedBox(height: 12),
        if (_error != null) AppErrorView(message: _error!),
        if (_data != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  QrImageView(data: _data!, size: 200),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.copy),
                    label: const Text('Copy content'),
                    onPressed: () async {
                      await Clipboard.setData(
                        ClipboardData(text: _data!),
                      );
                      ref.read(analyticsProvider).logEvent(
                            AnalyticsEvents.resultCopied,
                            toolSlug: widget.tool.slug,
                          );
                    },
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
