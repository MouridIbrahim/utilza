// Public catalogue home: gradient header, categories, featured grid.
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../app/theme_mode.dart';
import '../../../core/errors/api_exception.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/models/models.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../design/app_colors.dart';
import '../../../design/app_tokens.dart';
import '../../../design/widgets/app_search_bar.dart';
import '../../../design/widgets/category_tile.dart';
import '../../../design/widgets/empty_state.dart';
import '../../../design/widgets/skeleton_loader.dart';
import '../../../design/widgets/tool_card_3d.dart';
import '../../auth/presentation/auth_providers.dart';
import '../../categories/presentation/category_providers.dart';
import 'catalogue_providers.dart';

/// Public catalogue home: gradient header, categories, featured 2-col grid.
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
    final auth = ref.watch(authControllerProvider);
    final c = AppColorScheme.of(context);
    final reduced = MediaQuery.disableAnimationsOf(context);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(toolsControllerProvider.notifier).refresh(),
        child: CustomScrollView(
          controller: _scroll,
          slivers: [
                  SliverAppBar(
                    automaticallyImplyLeading: false,
                    floating: true,
                    snap: true,
                    expandedHeight: 252,
                    toolbarHeight: 0,
                    collapsedHeight: 0,
                    backgroundColor: Colors.transparent,
                    elevation: 0,
                    flexibleSpace: FlexibleSpaceBar(
                      collapseMode: CollapseMode.pin,
                      background: _GradientHeader(
                        authed: auth.isAuthenticated,
                        name: auth.user?.name,
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: OfflineBanner()),
                  SliverToBoxAdapter(
                    child: _CategoriesSection(categories: categories),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 20)),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Text('Featured tools',
                              style: AppBrand.title
                                  .copyWith(color: c.text)),
                          const Spacer(),
                          TextButton(
                            onPressed: () =>
                                context.push(AppRoutes.search),
                            child: const Text('View all'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (tools.isLoading)
                    SliverPadding(
                      padding: const EdgeInsets.all(16),
                      sliver: SliverGrid(
                        gridDelegate:
                            SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          mainAxisExtent: 190,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (_, _) => SkeletonCard(),
                          childCount: 6,
                        ),
                      ),
                    )
                  else if (tools.errorMessage != null && tools.items.isEmpty)
                    SliverToBoxAdapter(
                      child: AppErrorView(
                        message: tools.errorMessage!,
                        onRetry: () => ref
                            .read(toolsControllerProvider.notifier)
                            .refresh(),
                      ),
                    )
                  else if (tools.items.isEmpty)
                    const SliverToBoxAdapter(
                      child: EmptyState(
                        title: 'No tools available.',
                        detail: 'Pull down to try again.',
                        icon: Icons.build_outlined,
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                      sliver: SliverGrid(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          mainAxisExtent: 205,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, i) {
                            final tool = tools.items[i];
                            final card = ToolCard3D(
                              tool: tool,
                              heroTag: 'tool-${tool.id}',
                              onTap: () => context.push(
                                AppRoutes.toolWith(tool.slug),
                                extra: tool,
                              ),
                            );
                            if (reduced || i >= 10) return card;
                            return card
                                .animate()
                                .fadeIn(delay: (i * 40).ms, duration: 220.ms)
                                .slideY(
                                    begin: 0.12,
                                    end: 0,
                                    delay: (i * 40).ms,
                                    duration: 220.ms);
                          },
                          childCount: tools.items.length,
                        ),
                      ),
                    ),
                  if (tools.isLoadingMore)
                    const SliverToBoxAdapter(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child:
                            Center(child: CircularProgressIndicator()),
                      ),
                    )
                  else if (tools.hasMore && tools.items.isNotEmpty)
                    SliverToBoxAdapter(
                      child: Center(
                        child: TextButton(
                          onPressed: () => ref
                              .read(toolsControllerProvider.notifier)
                              .loadMore(),
                          child: const Text('Load more'),
                        ),
                      ),
                    ),
                  const SliverToBoxAdapter(child: SizedBox(height: 16)),
                ],
              ),
            ),
    );
  }
}

class _GradientHeader extends ConsumerWidget {
  const _GradientHeader({required this.authed, this.name});
  final bool authed;
  final String? name;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final greeting = authed && (name?.isNotEmpty == true)
        ? 'Welcome back, $name'
        : 'Everyday tools, all in one place.';
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primaryTop, AppColors.primaryBottom],
        ),
        borderRadius: const BorderRadius.vertical(
          bottom: Radius.circular(28),
        ),
        boxShadow: AppShape.tightShadow(dark: dark),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      greeting,
                      style: AppBrand.display.copyWith(
                        color: Colors.white,
                        fontSize: 24,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: dark
                        ? 'Switch to light mode'
                        : 'Switch to dark mode',
                    icon: Icon(
                      dark
                          ? Icons.light_mode_outlined
                          : Icons.dark_mode_outlined,
                      color: Colors.white,
                    ),
                    onPressed: () => ref
                        .read(themeModeControllerProvider.notifier)
                        .toggleLightDark(context),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                authed
                    ? 'Find your next tool below.'
                    : 'No account needed to run tools.',
                style: AppBrand.body.copyWith(
                  color: Colors.white.withValues(alpha: 0.85),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 12),
              AppSearchBar(
                readOnly: true,
                hintText: 'Search tools…',
                onTap: () => context.push(AppRoutes.search),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoriesSection extends ConsumerWidget {
  const _CategoriesSection({required this.categories});
  final AsyncValue<List<Category>> categories;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = AppColorScheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text('Categories',
              style: AppBrand.title.copyWith(color: c.text)),
        ),
        SizedBox(
          height: 118,
          child: categories.when(
            loading: () => ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: 4,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (_, _) => const SizedBox(
                width: 140,
                child: SkeletonLoader(height: 110, borderRadius: 16),
              ),
            ),
            error: (e, _) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextButton(
                onPressed: () => ref.invalidate(categoriesProvider),
                child: Text(
                  e is ApiException
                      ? ErrorMapper.userMessage(e)
                      : 'Failed to load.',
                ),
              ),
            ),
            data: (list) {
              if (list.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Text('No categories yet.'),
                );
              }
              return ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (_, i) {
                  final cat = list[i];
                  return SizedBox(
                    width: 140,
                    child: CategoryTile(
                      slug: cat.slug,
                      label: cat.name,
                      onTap: () => context.push(
                        AppRoutes.categoryWith(cat.slug),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
        const SizedBox(height: 4),
      ],
    );
  }
}
