/**
 * Catalog domain types for MediGo customer app.
 *
 * These are UI/domain types composed from the generated Supabase database types.
 * They represent the shape of data after mapping from raw Supabase rows.
 *
 * Source of truth: lib/database.types.ts (generated from Supabase schema).
 * Do NOT duplicate the entire generated schema here — only compose what the UI needs.
 */

// ─── Category ─────────────────────────────────────────────────────────────────

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  displayOrder: number;
}

// ─── Product list item (projection for ProductCard) ───────────────────────────

/**
 * Minimal product shape for list views (home, category, search results).
 * Fetches only fields required by ProductCard to avoid overfetching.
 */
export interface CatalogProductListItem {
  id: string;
  name: string;
  slug: string;
  packSize: string | null;
  mrpPaise: number;
  sellingPricePaise: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  primaryImageUrl: string | null;
  manufacturerName: string | null;
  brandName: string | null;
  /** Derived from inventory.available_quantity joined at query time */
  availableQuantity: number;
  inStock: boolean;
}

// ─── Product detail ───────────────────────────────────────────────────────────

export interface CatalogProductImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface CatalogComposition {
  id: string;
  compositionName: string;
  strength: string | null;
  displayOrder: number;
}

export interface CatalogProductDetail {
  id: string;
  name: string;
  slug: string;
  sku: string;
  packSize: string | null;
  description: string | null;
  uses: string | null;
  mrpPaise: number;
  sellingPricePaise: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  categoryId: string;
  brandId: string | null;
  brandName: string | null;
  manufacturerId: string | null;
  manufacturerName: string | null;
  /** Sorted: primary first, then by display_order ascending */
  images: CatalogProductImage[];
  /** Sorted by display_order ascending */
  compositions: CatalogComposition[];
}

// ─── Product availability ─────────────────────────────────────────────────────

export interface ProductAvailability {
  productId: string;
  isAvailable: boolean;
  availableQuantity: number;
  isLowStock: boolean;
}

// ─── Banner ───────────────────────────────────────────────────────────────────

export type BannerLinkType = 'product' | 'category' | 'url' | 'none';

export interface CatalogBanner {
  id: string;
  title: string;
  imageUrl: string;
  linkType: BannerLinkType;
  linkValue: string | null;
  displayOrder: number;
}

// ─── Paginated result ─────────────────────────────────────────────────────────

export interface CatalogPage<T> {
  items: T[];
  /** Offset to request the next page; null means no more pages. */
  nextOffset: number | null;
}

// ─── Search suggestion ────────────────────────────────────────────────────────

export interface SearchSuggestion {
  id: string;
  name: string;
  packSize: string | null;
}
