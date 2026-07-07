/**
 * TanStack Query hooks for the product catalog.
 *
 * All hooks delegate to catalog.service.ts — never call Supabase directly.
 *
 * Stale-time choices:
 * - Categories: 10 min  (rarely change during a session)
 * - Banners:    5 min   (can change but not frequently)
 * - Products:   5 min   (inventory/availability changes more often)
 * - Availability: 60 s (can change with each order)
 * - Search:      30 s  (fresh enough to feel live)
 *
 * Error behaviour:
 * - Permission errors (RLS) retry 0 times — retrying won't help.
 * - Network errors retry up to 2 times (default).
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { catalogKeys } from './catalog.keys';
import {
  CATALOG_PAGE_SIZE,
  FEATURED_LIMIT,
  BEST_SELLER_LIMIT,
  SIMILAR_LIMIT,
  getActiveBanners,
  getActiveCategories,
  getBestSellerProducts,
  getCategoryById,
  getCategoryProducts,
  getFeaturedProducts,
  getProductAvailability,
  getProductById,
  getSearchSuggestions,
  getSimilarProducts,
  searchProducts,
} from './catalog.service';

// ─── Helper ───────────────────────────────────────────────────────────────────

function retryForCatalog(failureCount: number, error: unknown): boolean {
  const msg = error instanceof Error ? error.message : '';
  // Do not retry RLS / permission errors.
  if (msg.includes('permission') || msg.includes('forbidden') || msg.includes('policy')) {
    return false;
  }
  return failureCount < 2;
}

// ─── Categories ───────────────────────────────────────────────────────────────

/**
 * All active categories, ordered by display_order.
 * Enabled by default — categories are public once authenticated.
 */
export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: getActiveCategories,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: retryForCatalog,
  });
}

/**
 * Single category by id.
 * Disabled if id is falsy.
 */
export function useCategory(id: string | undefined | null) {
  return useQuery({
    queryKey: catalogKeys.category(id ?? ''),
    queryFn: () => getCategoryById(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10,
    retry: retryForCatalog,
  });
}

// ─── Category products (paginated) ────────────────────────────────────────────

/**
 * Infinite-scroll product list for a category.
 * Each page is fetched with range-based offset pagination.
 */
export function useCategoryProducts(categoryId: string | undefined | null) {
  return useInfiniteQuery({
    queryKey: catalogKeys.categoryProducts(categoryId ?? ''),
    queryFn: ({ pageParam = 0 }) =>
      getCategoryProducts(categoryId!, pageParam, CATALOG_PAGE_SIZE),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    initialPageParam: 0,
    enabled: Boolean(categoryId),
    staleTime: 1000 * 60 * 5,
    retry: retryForCatalog,
  });
}

// ─── Featured products ────────────────────────────────────────────────────────

export function useFeaturedProducts(limit: number = FEATURED_LIMIT) {
  return useQuery({
    queryKey: catalogKeys.featured(),
    queryFn: () => getFeaturedProducts(limit),
    staleTime: 1000 * 60 * 5,
    retry: retryForCatalog,
  });
}

// ─── Best sellers ─────────────────────────────────────────────────────────────

export function useBestSellerProducts(limit: number = BEST_SELLER_LIMIT) {
  return useQuery({
    queryKey: catalogKeys.bestSellers(),
    queryFn: () => getBestSellerProducts(limit),
    staleTime: 1000 * 60 * 5,
    retry: retryForCatalog,
  });
}

// ─── Product detail ───────────────────────────────────────────────────────────

/**
 * Full product detail: images, compositions, brand, manufacturer.
 * Disabled if id is falsy.
 */
export function useProductDetails(id: string | undefined | null) {
  return useQuery({
    queryKey: catalogKeys.product(id ?? ''),
    queryFn: () => getProductById(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    retry: retryForCatalog,
  });
}

// ─── Product availability ─────────────────────────────────────────────────────

/**
 * Real-time availability via the get_product_availability() RPC.
 * Short stale time so the UI reflects stock changes quickly.
 */
export function useProductAvailability(productId: string | undefined | null) {
  return useQuery({
    queryKey: catalogKeys.productAvailability(productId ?? ''),
    queryFn: () => getProductAvailability(productId!),
    enabled: Boolean(productId),
    staleTime: 1000 * 60, // 1 minute
    retry: retryForCatalog,
  });
}

// ─── Banners ──────────────────────────────────────────────────────────────────

export function useActiveBanners() {
  return useQuery({
    queryKey: catalogKeys.banners(),
    queryFn: getActiveBanners,
    staleTime: 1000 * 60 * 5,
    retry: retryForCatalog,
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Full-text product search with pagination.
 * Disabled when query is empty.
 */
export function useProductSearch(query: string) {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: catalogKeys.search(trimmed),
    queryFn: ({ pageParam = 0 }) => searchProducts(trimmed, pageParam, CATALOG_PAGE_SIZE),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    initialPageParam: 0,
    enabled: trimmed.length > 0,
    staleTime: 1000 * 30, // 30 seconds
    retry: retryForCatalog,
  });
}

/**
 * Lightweight name suggestions (typeahead).
 * Disabled when query is fewer than 2 characters to avoid noise.
 */
export function useSearchSuggestions(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: catalogKeys.searchSuggestions(trimmed),
    queryFn: () => getSearchSuggestions(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 30,
    retry: 0, // suggestions are best-effort
  });
}

// ─── Similar products ─────────────────────────────────────────────────────────

/**
 * Products from the same category, excluding the current product.
 * Disabled if either id is missing.
 */
export function useSimilarProducts(
  productId: string | undefined | null,
  categoryId: string | undefined | null,
  limit: number = SIMILAR_LIMIT,
) {
  return useQuery({
    queryKey: catalogKeys.similarProducts(productId ?? '', categoryId ?? ''),
    queryFn: () => getSimilarProducts(productId!, categoryId!, limit),
    enabled: Boolean(productId) && Boolean(categoryId),
    staleTime: 1000 * 60 * 5,
    retry: retryForCatalog,
  });
}
