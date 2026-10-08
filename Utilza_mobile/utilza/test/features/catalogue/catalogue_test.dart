import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:utilza/core/errors/api_exception.dart';
import 'package:utilza/core/models/models.dart';
import 'package:utilza/core/network/api_client.dart';
import 'package:utilza/features/catalogue/data/catalogue_remote_datasource.dart';
import 'package:utilza/features/catalogue/data/catalogue_repository_impl.dart';
import 'package:utilza/features/catalogue/domain/catalogue_repository.dart';
import 'package:utilza/features/catalogue/presentation/catalogue_providers.dart';
import 'package:utilza/features/categories/data/category_remote_datasource.dart';
import 'package:utilza/features/categories/data/category_repository_impl.dart';

Dio stubDio({
  required Map<String, dynamic> Function(RequestOptions options) respond,
  void Function(RequestOptions options)? capture,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://example.com/api/v1'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        capture?.call(options);
        handler.resolve(
          Response(
            requestOptions: options,
            statusCode: 200,
            data: respond(options),
          ),
        );
      },
    ),
  );
  return dio;
}

Map<String, dynamic> toolJson(String id, String slug) => {
      'id': id,
      'name': 'Tool $slug',
      'slug': slug,
      'description': 'desc',
      'implementation': 'backend',
    };

class FakeCatalogueRepository implements CatalogueRepository {
  FakeCatalogueRepository({required this.pages});
  final Map<int, Pagination<Tool>> pages;
  final List<Map<String, dynamic>> seenQueries = [];

  @override
  Future<Pagination<Tool>> getTools({
    String? category,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    seenQueries.add({
      'category': category,
      'search': search,
      'page': page,
      'limit': limit,
    });
    final p = pages[page];
    if (p == null) throw Exception('no page $page');
    return p;
  }

  @override
  Future<Tool?> findBySlug(String slug) async => null;
}

Pagination<Tool> pageOf(List<Tool> items,
        {int page = 1, int total = 0}) =>
    Pagination<Tool>(items: items, page: page, limit: 20, total: total);

void main() {
  group('categories', () {
    test('loads items envelope, filters inactive, sorts', () async {
      final ds = CategoryRemoteDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {
                'items': [
                  {'id': '2', 'slug': 'b', 'name': 'B', 'sortOrder': 2},
                  {
                    'id': '1',
                    'slug': 'a',
                    'name': 'A',
                    'sortOrder': 1,
                    'isActive': false
                  },
                  {'id': '3', 'slug': 'c', 'name': 'C', 'sortOrder': 0},
                ]
              },
            },
          ),
        ),
      );
      final repo = CategoryRepositoryImpl(ds);
      final cats = await repo.getCategories();
      expect(cats.map((c) => c.slug), ['c', 'b']);
    });

    test('returns cache when remote fails', () async {
      var fail = false;
      final dio = Dio(BaseOptions(baseUrl: 'https://x'));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (o, h) {
            if (fail) {
              h.reject(
                DioException(
                  requestOptions: o,
                  type: DioExceptionType.badResponse,
                  response: Response(
                    requestOptions: o,
                    statusCode: 500,
                    data: {
                      'success': false,
                      'error': {'code': 'INTERNAL_ERROR', 'message': 'x'}
                    },
                  ),
                ),
              );
            } else {
              h.resolve(
                Response(
                  requestOptions: o,
                  statusCode: 200,
                  data: {
                    'success': true,
                    'data': {
                      'items': [
                        {'id': '1', 'slug': 'a', 'name': 'A'}
                      ]
                    },
                  },
                ),
              );
            }
          },
        ),
      );
      final repo = CategoryRepositoryImpl(
        CategoryRemoteDataSource(ApiClient(dio: dio)),
      );
      final first = await repo.getCategories();
      expect(first.single.slug, 'a');
      fail = true;
      final second = await repo.getCategories();
      expect(second.single.slug, 'a');
    });
  });

  group('tools catalogue', () {
    test('omits empty optionals, clamps page/limit', () async {
      Map<String, dynamic>? seen;
      final ds = CatalogueRemoteDataSource(
        ApiClient(
          dio: stubDio(
            capture: (o) => seen = Map.of(o.queryParameters),
            respond: (_) => {
              'success': true,
              'data': {'items': [], 'page': 1, 'limit': 20, 'total': 0}
            },
          ),
        ),
      );
      await ds.getTools(category: '', search: '', page: 0, limit: 99);
      expect(seen, {'page': 1, 'limit': 50});
      await ds.getTools(category: 'pdf', search: 'merge');
      expect(seen?['category'], 'pdf');
      expect(seen?['search'], 'merge');
    });

    test('parses pagination envelope', () async {
      final ds = CatalogueRemoteDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {
                'items': [toolJson('t1', 'merge')],
                'page': 1,
                'limit': 20,
                'total': 1,
              }
            },
          ),
        ),
      );
      final page = await ds.getTools();
      expect(page.items.single.slug, 'merge');
      expect(page.totalPages, 1);
    });

    test('findBySlug matches exact slug only', () async {
      final ds = CatalogueRemoteDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {
                'items': [toolJson('t1', 'merge-pdfs')],
                'page': 1,
                'limit': 50,
                'total': 1,
              }
            },
          ),
        ),
      );
      expect(await ds.findBySlug('merge-pdfs'), isNotNull);
      expect(await ds.findBySlug('merge'), isNull);
    });

    test('empty results handled', () async {
      final ds = CatalogueRemoteDataSource(
        ApiClient(
          dio: stubDio(
            respond: (_) => {
              'success': true,
              'data': {'items': [], 'page': 1, 'limit': 20, 'total': 0}
            },
          ),
        ),
      );
      final repo = CatalogueRepositoryImpl(ds);
      final page = await repo.getTools(search: 'zzz-no-match');
      expect(page.items, isEmpty);
      expect(page.total, 0);
    });
  });

  group('ToolsController pagination', () {    ProviderContainer containerWith(Map<int, Pagination<Tool>> pages) {
      return ProviderContainer(
        overrides: [
          catalogueRepositoryProvider.overrideWithValue(
            FakeCatalogueRepository(pages: pages),
          ),
        ],
      );
    }

    Tool tool(String id) =>
        Tool.fromJson(toolJson(id, 'slug-$id'));

    test('loadFirst resets to page 1, loadMore appends deduped', () async {
      final c = containerWith({
        1: pageOf([tool('1'), tool('2')], total: 3),
        2: pageOf([tool('2'), tool('3')], page: 2, total: 3),
      });
      addTearDown(c.dispose);
      await c.read(toolsControllerProvider.notifier).loadFirst();
      expect(c.read(toolsControllerProvider).items.map((t) => t.id),
          ['1', '2']);
      await c.read(toolsControllerProvider.notifier).loadMore();
      expect(c.read(toolsControllerProvider).items.map((t) => t.id),
          ['1', '2', '3']);
      expect(c.read(toolsControllerProvider).hasMore, isFalse);
    });

    test('filter change resets items', () async {
      final fake = FakeCatalogueRepository(pages: {
        1: pageOf([tool('1')], total: 1),
      });
      final c = ProviderContainer(
        overrides: [
          catalogueRepositoryProvider.overrideWithValue(fake),
        ],
      );
      addTearDown(c.dispose);
      await c
          .read(toolsControllerProvider.notifier)
          .loadFirst(category: 'pdf');
      expect(fake.seenQueries.last['category'], 'pdf');
      expect(fake.seenQueries.last['page'], 1);
      await c
          .read(toolsControllerProvider.notifier)
          .loadFirst(search: 'merge');
      expect(c.read(toolsControllerProvider).category, isNull);
      expect(c.read(toolsControllerProvider).search, 'merge');
    });

    test('failures store friendly messages, never raw exceptions', () async {
      final c = ProviderContainer(
        overrides: [
          catalogueRepositoryProvider.overrideWithValue(
            _FailingCatalogue(),
          ),
        ],
      );
      addTearDown(c.dispose);
      await c.read(toolsControllerProvider.notifier).loadFirst();
      final message = c.read(toolsControllerProvider).errorMessage!;
      expect(message, isNot(contains('ApiException')));
      expect(message, contains('internet'));
    });
  });
}

class _FailingCatalogue implements CatalogueRepository {
  @override
  Future<Pagination<Tool>> getTools({
    String? category,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    throw const ApiException(
      code: 'NETWORK_ERROR',
      message: 'No internet connection. Please check and retry.',
    );
  }

  @override
  Future<Tool?> findBySlug(String slug) async => null;
}
