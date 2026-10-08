import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../app/theme_mode.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/widgets/common.dart';
import '../../../design/app_colors.dart';
import '../../../design/app_tokens.dart';
import '../../admin/presentation/admin_providers.dart';
import '../../auth/presentation/auth_providers.dart';
import 'profile_providers.dart';

/// Profile: view/update name (1–100, no clearing), logout, delete.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _name = TextEditingController();
  bool _saving = false;
  bool _initialized = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final value = _name.text.trim();
    if (value.isEmpty) {
      // Backend accepts null but does not clear; don't offer clearing.
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Name cannot be empty. Clearing is not supported.'),
        ),
      );
      return;
    }
    if (value.length > 100) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Name must be 1–100 characters.'),
        ),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final updated = await ref
          .read(profileRepositoryProvider)
          .updateName(value);
      ref.invalidate(profileProvider);
      setState(() => _name.text = updated.name ?? value);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated.')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ErrorMapper.userMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete account?'),
        content: const Text(
          'This permanently deletes your account, favorites, history, '
          'and subscription. There is no undo.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await deleteAccountAndClear(ref);
      if (mounted) context.go(AppRoutes.home);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ErrorMapper.userMessage(e))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),      body: profile.when(
        loading: () => const AppLoading(message: 'Loading profile…'),
        error: (e, _) => AppErrorView(
          message: e is ApiException
              ? ErrorMapper.userMessage(e)
              : 'Failed to load profile.',
          onRetry: () => ref.invalidate(profileProvider),
        ),
        data: (user) {
          if (!_initialized) {
            _name.text = user.name ?? '';
            _initialized = true;
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Email: ${user.email}'),
              const SizedBox(height: 16),
              TextField(
                controller: _name,
                decoration: const InputDecoration(
                  labelText: 'Name (1–100)',
                  helperText: 'Clearing the name is not supported.',
                ),
                maxLength: 100,
              ),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child:
                            CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Save'),
              ),
              const SizedBox(height: 24),
              OutlinedButton(
                onPressed: () async {
                  await ref
                      .read(authControllerProvider.notifier)
                      .logout();
                  if (context.mounted) context.go(AppRoutes.home);
                },
                child: const Text('Logout'),
              ),
              const SizedBox(height: 24),
              const _AppearanceSection(),
              const SizedBox(height: 8),
              const _AdminSection(),
              const SizedBox(height: 16),
              const Divider(),
              Text(
                'Danger zone',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(
                      color: Theme.of(context).colorScheme.error,
                    ),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor:
                      Theme.of(context).colorScheme.error,
                ),
                onPressed: _confirmDelete,
                child: const Text('Delete account'),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Appearance: theme choice persisted across restarts (UI only).
class _AppearanceSection extends ConsumerWidget {
  const _AppearanceSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeControllerProvider);
    final c = AppColorScheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Appearance',
            style:
                AppBrand.title.copyWith(color: c.text, fontSize: 16)),
        const SizedBox(height: 8),
        SegmentedButton<ThemeMode>(
          segments: const [
            ButtonSegment(
              value: ThemeMode.system,
              label: Text('System'),
              icon: Icon(Icons.settings_suggest_outlined),
            ),
            ButtonSegment(
              value: ThemeMode.light,
              label: Text('Light'),
              icon: Icon(Icons.light_mode_outlined),
            ),
            ButtonSegment(
              value: ThemeMode.dark,
              label: Text('Dark'),
              icon: Icon(Icons.dark_mode_outlined),
            ),
          ],
          selected: {mode},
          onSelectionChanged: (s) =>
              ref.read(themeModeControllerProvider.notifier).setMode(s.first),
        ),
      ],
    );
  }
}

/// Administration: visible only when the backend admin gate passes.
/// Never a local role flag.
class _AdminSection extends ConsumerWidget {
  const _AdminSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final admin = ref.watch(isAdminProvider);
    return admin.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (isAdmin) {
        if (!isAdmin) return const SizedBox.shrink();
        final c = AppColorScheme.of(context);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Administration',
                style: AppBrand.title
                    .copyWith(color: c.text, fontSize: 16)),
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.build_outlined),
              title: const Text('Admin tools'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push(AppRoutes.adminTools),
            ),
            ListTile(
              leading: const Icon(Icons.group_outlined),
              title: const Text('Admin users'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push(AppRoutes.adminUsers),
            ),
          ],
        );
      },
    );
  }
}
