/**
 * Centralized TanStack Query key factory for the product catalog.
 *
 * All cache keys that affect the same data must share a common prefix so that
 * invalidation (e.g. after admin changes) can cascade correctly.
 *
 * Keys include every variable that changes the query result.
 * Search queries are normalized (trimmed + lowercased) to avoid cache fragmentation.
 */

export const catalogKeys = {
  /** Root key — invalidating this clears all catalog cache. */
  all: ['catalog'] as const,

  /** Home screen combined data. */
  home: () => [...catalogKeys.all, 'home'] as const,

  /** All active categories list. */
  categories: () => [...catalogKeys.all, 'categories'] as const,

  /** Single category by id. */
  category: (id: string) => [...catalogKeys.all, 'category', id] as const,

  /**
   * Paginated product list for a category.
   * Keyed by (categoryId, page offset) — each page is a separate cache entry
   * so useInfiniteQuery can merge them.
   */
  categoryProducts: (categoryId: string) =>
    [...catalogKeys.all, 'categoryProducts', categoryId] as const,

  /** Featured products list. */
  featured: () => [...catalogKeys.all, 'featured'] as const,

  /** Best-seller products list. */
  bestSellers: () => [...catalogKeys.all, 'bestSellers'] as const,

  /** Single product detail by id. */
  product: (id: string) => [...catalogKeys.all, 'product', id] as const,

  /** Product availability (inventory RPC) by product id. */
  productAvailability: (id: string) =>
    [...catalogKeys.all, 'productAvailability', id] as const,

  /** Full-text search results for a query string. */
  search: (query: string) =>
    [...catalogKeys.all, 'search', query.trim().toLowerCase()] as const,

  /** Lightweight name suggestions for a query string. */
  searchSuggestions: (query: string) =>
    [...catalogKeys.all, 'suggestions', query.trim().toLowerCase()] as const,

  /** Active promotional banners. */
  banners: () => [...catalogKeys.all, 'banners'] as const,

  /** Similar products — products in the same category, excluding the current product. */
  similarProducts: (productId: string, categoryId: string) =>
    [...catalogKeys.all, 'similar', productId, categoryId] as const,
} as const;
