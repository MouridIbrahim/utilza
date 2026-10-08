import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/analytics_events.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/models/models.dart';
import '../../../core/network/multipart_helper.dart';
import '../../../core/network/providers.dart';
import '../../../core/utils/file_saver.dart';
import '../../../core/utils/url_resolver.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../auth/presentation/auth_providers.dart';
import '../../catalogue/presentation/catalogue_providers.dart';
import '../../history/presentation/history_providers.dart';
import '../data/backend_tool_datasource.dart';
import '../domain/tool_executor_config.dart';
import 'json_result_view.dart';

final backendToolDataSourceProvider =
    Provider<BackendToolDataSource>((ref) {
  return BackendToolDataSource(ref.watch(apiClientProvider));
});

enum _ExecStatus { idle, uploading, success, error }

class _Picked {
  const _Picked({required this.name, required this.path, required this.size});
  final String name;
  final String path;
  final int size;
}

/// Generic executor: file picker → multipart POST → result actions.
/// Used by every backend tool (Phase 9) with its exact config.
/// No progress API exists, so uploads show indeterminate progress and
/// duplicate submissions are disabled while processing.
class BackendExecutorScreen extends ConsumerStatefulWidget {
  const BackendExecutorScreen({
    super.key,
    required this.tool,
    required this.config,
  });
  final Tool tool;
  final ToolExecutorConfig config;

  @override
  ConsumerState<BackendExecutorScreen> createState() =>
      _BackendExecutorScreenState();
}

class _BackendExecutorScreenState
    extends ConsumerState<BackendExecutorScreen> {
  final _form = GlobalKey<FormState>();
  final _controllers = <String, TextEditingController>{};
  final _picked = <_Picked>[];
  var _status = _ExecStatus.idle;
  BackendToolOutcome? _outcome;
  String? _error;
  final _toggleValues = <String, bool>{};
  final _selectValues = <String, String>{};
  bool _downloading = false;
  String? _downloadError;

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _controllerFor(ToolField field) {
    return _controllers.putIfAbsent(
      field.name,
      () => TextEditingController(text: field.defaultValue ?? ''),
    );
  }

  Future<void> _pickFiles() async {
    final config = widget.config;
    final files = await FilePicker.pickFiles(
      type: config.allowedExtensions.isEmpty
          ? FileType.any
          : FileType.custom,
      allowedExtensions:
          config.allowedExtensions.isEmpty ? null : config.allowedExtensions.toList(),
    );
    if (files.isEmpty) return;
    final room = config.maxFiles - _picked.length;
    if (room <= 0) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('At most ${config.maxFiles} file(s).'),
          ),
        );
      }
      return;
    }
    var added = 0;
    for (final f in files.take(room)) {
      final path = f.path;
      if (path == null) continue;
      final size = f.lengthSync() ?? await f.length() ?? 0;
      _picked.add(_Picked(name: f.name, path: path, size: size));
      added++;
    }
    if (added == 0 && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not read the selected file.')),
      );
    }
    setState(() {});
  }

  String? _filesError() {
    final config = widget.config;
    return validateFileSelection(
      count: _picked.length,
      fileNames: [for (final f in _picked) f.name],
      fileSizes: [for (final f in _picked) f.size],
      minFiles: config.minFiles,
      maxFiles: config.maxFiles,
      allowedExtensions: config.allowedExtensions,
      maxSizePerFile: config.maxSizePerFile,
      maxCombinedSize: config.maxCombinedSize,
    );
  }

  Map<String, dynamic> _fieldValues() {
    final out = <String, dynamic>{};
    for (final field in widget.config.fields) {
      switch (field.type) {
        case ToolFieldType.toggle:
          out[field.name] = _toggleValues[field.name] ?? false;
          break;
        case ToolFieldType.select:
          final v = _selectValues[field.name];
          if (v != null && v.isNotEmpty) out[field.name] = v;
          break;
        case ToolFieldType.text:
        case ToolFieldType.number:
        case ToolFieldType.integer:
          final v = _controllerFor(field).text.trim();
          final encoded = field.encode(v);
          if (encoded != null) out[field.name] = encoded;
          break;
      }
    }
    return out;
  }

  Future<void> _submit() async {
    if (_status == _ExecStatus.uploading) return;
    final filesError = _filesError();
    final formOk = _form.currentState?.validate() ?? true;
    if (filesError != null || !formOk) {
      setState(() {
        _status = _ExecStatus.error;
        _error = filesError ?? 'Please fix the highlighted fields.';
        _outcome = null;
      });
      return;
    }
    final fields = _fieldValues();
    final crossError =
        widget.config.extraValidate?.call(fields, _picked.length);
    if (crossError != null) {
      setState(() {
        _status = _ExecStatus.error;
        _error = crossError;
        _outcome = null;
      });
      return;
    }
    setState(() {
      _status = _ExecStatus.uploading;
      _error = null;
      _outcome = null;
    });
    try {
      final multipart = [
        for (final f in _picked)
          await MultipartFile.fromFile(f.path, filename: f.name),
      ];
      final outcome = await ref
          .read(backendToolDataSourceProvider)
          .execute(
            config: widget.config,
            files: multipart,
            fields: fields,
          );
      ref.read(analyticsProvider).logEvent(
            AnalyticsEvents.fileUploaded,
            toolSlug: widget.tool.slug,
          );
      ref.read(analyticsProvider).logEvent(
            AnalyticsEvents.toolCompleted,
            toolSlug: widget.tool.slug,
          );
      if (ref.read(authControllerProvider).isAuthenticated) {
        await ref.read(historyControllerProvider.notifier).record(
              widget.tool.slug,
              inputSummary: widget.config.summarize(
                fields,
                [for (final f in _picked) f.name],
              ),
            );
      }
      setState(() {
        _status = _ExecStatus.success;
        _outcome = outcome;
      });
    } on ApiException catch (e) {
      ref.read(analyticsProvider).logEvent(
            AnalyticsEvents.toolFailed,
            toolSlug: widget.tool.slug,
          );
      setState(() {
        _status = _ExecStatus.error;
        _error = ErrorMapper.userMessage(e);
        if (e.isExpiredResult) {
          _error = 'This result has expired. Please run the tool again.';
        }
      });
    } catch (e) {
      ref.read(analyticsProvider).logEvent(
            AnalyticsEvents.toolFailed,
            toolSlug: widget.tool.slug,
          );
      setState(() {
        _status = _ExecStatus.error;
        _error = 'Something went wrong. Please try again.';
      });
    }
  }

  Future<void> _download({
    required String downloadUrl,
    required String name,
  }) async {
    if (_downloading) return;
    setState(() {
      _downloading = true;
      _downloadError = null;
    });
    try {
      final url = resolveDownloadUrl(downloadUrl);
      final bytes = await ref.read(apiClientProvider).downloadBytes(url);
      final file = await FileSaver.save(bytes, suggestedName: name);
      ref.read(analyticsProvider).logEvent(
            AnalyticsEvents.resultDownloaded,
            toolSlug: widget.tool.slug,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Saved: ${file.path}')),
        );
        await FileSaver.open(file);
      }
    } on ApiException catch (e) {
      setState(() {
        _downloadError = e.isExpiredResult
            ? 'This result has expired. Please run the tool again.'
            : ErrorMapper.userMessage(e);
      });
    } catch (_) {
      setState(() {
        _downloadError = 'Download failed. Please try again.';
      });
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _share({
    required String downloadUrl,
    required String name,
  }) async {
    if (_downloading) return;
    setState(() {
      _downloading = true;
      _downloadError = null;
    });
    try {
      final url = resolveDownloadUrl(downloadUrl);
      final bytes = await ref.read(apiClientProvider).downloadBytes(url);
      final file = await FileSaver.save(bytes, suggestedName: name);
      await FileSaver.share(file);
    } on ApiException catch (e) {
      setState(() {
        _downloadError = e.isExpiredResult
            ? 'This result has expired. Please run the tool again.'
            : ErrorMapper.userMessage(e);
      });
    } catch (_) {
      setState(() {
        _downloadError = 'Share failed. Please try again.';
      });
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  void _rerun() {
    setState(() {
      _status = _ExecStatus.idle;
      _outcome = null;
      _error = null;
      _downloadError = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final tool = widget.tool;
    final config = widget.config;
    final uploading = _status == _ExecStatus.uploading;
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
          if (config.notice != null) ...[
            const SizedBox(height: 12),
            Card(
              color: Theme.of(context).colorScheme.errorContainer,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(config.notice!),
              ),
            ),
          ],
          const SizedBox(height: 16),
          Text('Files (${_picked.length}/${config.maxFiles})',
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            icon: const Icon(Icons.attach_file),
            label: const Text('Select files'),
            onPressed: uploading ? null : _pickFiles,
          ),
          for (var i = 0; i < _picked.length; i++)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.insert_drive_file_outlined),
              title: Text(_picked[i].name),
              subtitle: Text('${(_picked[i].size / 1024).ceil()} KB'),
              trailing: IconButton(
                icon: const Icon(Icons.close),
                onPressed: uploading
                    ? null
                    : () => setState(() => _picked.removeAt(i)),
              ),
            ),
          const SizedBox(height: 8),
          Form(
            key: _form,
            child: Column(
              children: [
                for (final field in config.fields)
                  _FieldInput(
                    field: field,
                    controller: _controllerFor(field),
                    toggleValue: _toggleValues[field.name] ?? false,
                    onToggle: (v) => setState(
                      () => _toggleValues[field.name] = v,
                    ),
                    selectValue: _selectValues[field.name],
                    onSelect: (v) => setState(
                      () => _selectValues[field.name] = v ?? '',
                    ),
                    enabled: !uploading,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: uploading ? null : _submit,
            child: uploading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Run'),
          ),
          if (uploading) ...[
            const SizedBox(height: 12),
            const AppLoading(message: 'Uploading/processing…'),
          ],
          if (_status == _ExecStatus.error && _error != null) ...[
            const SizedBox(height: 12),
            AppErrorView(message: _error!, onRetry: _submit),
            TextButton(onPressed: _rerun, child: const Text('Reset')),
          ],
          if (_status == _ExecStatus.success && _outcome != null) ...[
            const SizedBox(height: 16),
            _OutcomeView(
              tool: tool,
              outcome: _outcome!,
              downloading: _downloading,
              downloadError: _downloadError,
              onDownload: _download,
              onShare: _share,
            ),
            TextButton(onPressed: _rerun, child: const Text('Run again')),
          ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FieldInput extends StatelessWidget {
  const _FieldInput({
    required this.field,
    required this.controller,
    required this.toggleValue,
    required this.onToggle,
    required this.selectValue,
    required this.onSelect,
    required this.enabled,
  });
  final ToolField field;
  final TextEditingController controller;
  final bool toggleValue;
  final ValueChanged<bool> onToggle;
  final String? selectValue;
  final ValueChanged<String?> onSelect;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    switch (field.type) {
      case ToolFieldType.toggle:
        return SwitchListTile(
          title: Text(field.label),
          subtitle: field.hint != null ? Text(field.hint!) : null,
          value: toggleValue,
          onChanged: enabled ? onToggle : null,
        );
      case ToolFieldType.select:
        return DropdownButtonFormField<String>(
          decoration: InputDecoration(
            labelText: field.label,
            helperText: field.hint,
          ),
          initialValue: (selectValue?.isNotEmpty == true)
              ? selectValue
              : (field.defaultValue?.isNotEmpty == true
                  ? field.defaultValue
                  : null),
          items: [
            for (final o in field.options)
              DropdownMenuItem(value: o, child: Text(o)),
          ],
          validator: field.validate,
          onChanged: enabled ? onSelect : null,
        );
      case ToolFieldType.number:
      case ToolFieldType.integer:
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextFormField(
            controller: controller,
            decoration: InputDecoration(
              labelText: field.label,
              helperText: field.hint,
            ),
            keyboardType:
                const TextInputType.numberWithOptions(decimal: true),
            enabled: enabled,
            validator: field.validate,
          ),
        );
      case ToolFieldType.text:
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextFormField(
            controller: controller,
            decoration: InputDecoration(
              labelText: field.label,
              helperText: field.hint,
            ),
            enabled: enabled,
            validator: field.validate,
          ),
        );
    }
  }
}

class _OutcomeView extends StatelessWidget {
  const _OutcomeView({
    required this.tool,
    required this.outcome,
    required this.downloading,
    required this.downloadError,
    required this.onDownload,
    required this.onShare,
  });
  final Tool tool;
  final BackendToolOutcome outcome;
  final bool downloading;
  final String? downloadError;
  final Future<void> Function({required String downloadUrl, required String name})
      onDownload;
  final Future<void> Function({required String downloadUrl, required String name})
      onShare;

  @override
  Widget build(BuildContext context) {
    final outcome = this.outcome;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Results expire after about an hour. Save or share promptly.',
          style: TextStyle(fontStyle: FontStyle.italic),
        ),
        const SizedBox(height: 12),
        switch (outcome) {
          FileToolOutcome(:final result) => _FileResultCard(
              fileId: result.fileId,
              downloadUrl: result.downloadUrl,
              mimeType: result.mimeType,
              size: result.size,
              downloading: downloading,
              onDownload: onDownload,
              onShare: onShare,
            ),
          ZipExtractOutcome(:final result) => Column(
              children: [
                Text('${result.count} file(s) extracted.'),
                const SizedBox(height: 8),
                for (final f in result.files)
                  _FileResultCard(
                    fileId: f.fileId,
                    downloadUrl: f.downloadUrl,
                    mimeType: f.mimeType,
                    size: f.size,
                    name: f.name,
                    downloading: downloading,
                    onDownload: onDownload,
                    onShare: onShare,
                  ),
              ],
            ),
          JsonToolOutcome(:final data) => _JsonResultCard(
              tool: tool,
              data: data,
            ),
        },
        if (downloadError != null) ...[
          const SizedBox(height: 8),
          AppErrorView(message: downloadError!),
        ],
      ],
    );
  }
}

class _FileResultCard extends StatelessWidget {
  const _FileResultCard({
    required this.fileId,
    required this.downloadUrl,
    this.mimeType,
    this.size,
    this.name,
    required this.downloading,
    required this.onDownload,
    required this.onShare,
  });
  final String fileId;
  final String downloadUrl;
  final String? mimeType;
  final int? size;
  final String? name;
  final bool downloading;
  final Future<void> Function({required String downloadUrl, required String name})
      onDownload;
  final Future<void> Function({required String downloadUrl, required String name})
      onShare;

  @override
  Widget build(BuildContext context) {
    final label = name ?? fileId;
    final sizeText =
        size != null ? '${(size! / 1024).ceil()} KB' : 'unknown size';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.check_circle, color: Colors.green, size: 40),
            const SizedBox(height: 8),
            Text(label, textAlign: TextAlign.center),
            Text(
              '${mimeType ?? 'file'} • $sizeText',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            if (downloading)
              const Center(child: CircularProgressIndicator())
            else ...[
              FilledButton.icon(
                icon: const Icon(Icons.download),
                label: const Text('Download'),
                onPressed: () => onDownload(
                  downloadUrl: downloadUrl,
                  name: label,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.open_in_new),
                      label: const Text('Open'),
                      onPressed: () => onDownload(
                        downloadUrl: downloadUrl,
                        name: label,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.share),
                      label: const Text('Share'),
                      onPressed: () => onShare(
                        downloadUrl: downloadUrl,
                        name: label,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _JsonResultCard extends ConsumerWidget {
  const _JsonResultCard({required this.tool, required this.data});
  final Tool tool;
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Result'),
            const SizedBox(height: 8),
            JsonResultView(data: data),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              icon: const Icon(Icons.copy),
              label: const Text('Copy result'),
              onPressed: () async {
                await Clipboard.setData(
                  ClipboardData(text: data.toString()),
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
