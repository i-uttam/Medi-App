/**
 * Catalog data service for MediGo customer app.
 *
 * All catalog reads go through this service — screens and hooks must NOT call
 * Supabase directly. This centralises query logic, error mapping, and type
 * coercion in one place.
 *
 * SECURITY NOTES:
 * - All queries rely on Supabase Row-Level Security (migration 017).
 * - Customers automatically see only is_active + non-archived products.
 * - Inventory is readable by customers (migration 017 policy grants SELECT).
 * - Availability details use the get_product_availability() SECURITY DEFINER RPC.
 * - inventory_transactions table is never queried here (denied by RLS).
 *
 * DATA RULES:
 * - Do NOT fall back to mock/fake data on error — throw a typed CatalogError.
 * - Empty results (no products, no categories, no banners) return empty arrays.
 * - Nullable fields are preserved as null; missing optional fields are null.
 */

import { supabase } from '@/lib/supabase';
import type {
  BannerLinkType,
  CatalogBanner,
  CatalogCategory,
  CatalogPage,
  CatalogProductDetail,
  CatalogProductListItem,
  ProductAvailability,
  SearchSuggestion,
} from './catalog.types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATALOG_PAGE_SIZE = 20;
export const FEATURED_LIMIT = 10;
export const BEST_SELLER_LIMIT = 10;
export const SIMILAR_LIMIT = 6;
export const SUGGESTIONS_LIMIT = 5;

// ─── Error ────────────────────────────────────────────────────────────────────

export class CatalogError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CatalogError';
  }
}

function toCatalogError(err: unknown, context: string): CatalogError {
  if (err instanceof CatalogError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  // Do not expose raw PostgreSQL / Supabase messages to callers.
  // Map known codes to user-safe messages.
  if (msg.includes('permission') || msg.includes('policy') || msg.includes('row-level')) {
    return new CatalogError('You do not have permission to view this content.', 'forbidden', err);
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return new CatalogError('Network error. Please check your connection.', 'network_error', err);
  }
  return new CatalogError(`Failed to load ${context}.`, 'server_error', err);
}

// ─── Row types (raw Supabase PostgREST shapes) ────────────────────────────────

/**
 * Shape returned by the product list select query.
 * brands / manufacturers are objects (FK many-to-one), product_images is array.
 */
type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  pack_size: string | null;
  mrp_paise: number;
  selling_price_paise: number;
  is_featured: boolean;
  is_best_seller: boolean;
  brands: { name: string } | null;
  manufacturers: { name: string } | null;
  product_images: Array<{ image_url: string; is_primary: boolean; display_order: number }>;
  inventory: { available_quantity: number } | null;
};

const PRODUCT_LIST_SELECT = `
  id,
  name,
  slug,
  pack_size,
  mrp_paise,
  selling_price_paise,
  is_featured,
  is_best_seller,
  brands ( name ),
  manufacturers ( name ),
  product_images ( image_url, is_primary, display_order ),
  inventory ( available_quantity )
`.trim();

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapProductListItem(row: ProductListRow): CatalogProductListItem {
  const images = row.product_images ?? [];
  // Primary image: prefer is_primary = true; fall back to lowest display_order.
  const sorted = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.display_order - b.display_order;
  });
  const primaryImage = sorted[0] ?? null;
  const availableQty = row.inventory?.available_quantity ?? 0;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    packSize: row.pack_size,
    mrpPaise: row.mrp_paise,
    sellingPricePaise: row.selling_price_paise,
    isFeatured: row.is_featured,
    isBestSeller: row.is_best_seller,
    primaryImageUrl: primaryImage?.image_url ?? null,
    manufacturerName: (row.manufacturers as { name: string } | null)?.name ?? null,
    brandName: (row.brands as { name: string } | null)?.name ?? null,
    availableQuantity: availableQty,
    inStock: availableQty > 0,
  };
}

// ─── Categories ───────────────────────────────────────────────────────────────

/**
 * Returns all customer-visible active categories, ordered by display_order then name.
 * RLS enforces is_active = TRUE.
 */
export async function getActiveCategories(): Promise<CatalogCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, image_url, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw toCatalogError(error, 'categories');

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.image_url,
    displayOrder: row.display_order,
  }));
}

/**
 * Returns a single category by id.
 * Returns null if not found or not visible (RLS).
 */
export async function getCategoryById(id: string): Promise<CatalogCategory | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, image_url, display_order')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw toCatalogError(error, 'category');
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    imageUrl: data.image_url,
    displayOrder: data.display_order,
  };
}

// ─── Category products ────────────────────────────────────────────────────────

/**
 * Returns a paginated page of customer-visible products in a category.
 * Uses range-based (offset) pagination.
 * RLS enforces is_active = TRUE AND archived_at IS NULL on products.
 */
export async function getCategoryProducts(
  categoryId: string,
  offset: number,
  pageSize: number = CATALOG_PAGE_SIZE,
): Promise<CatalogPage<CatalogProductListItem>> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('category_id', categoryId)
    .order('name', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) throw toCatalogError(error, 'category products');

  const items = (data ?? []).map((row) => mapProductListItem(row as unknown as ProductListRow));
  const nextOffset = items.length === pageSize ? offset + pageSize : null;

  return { items, nextOffset };
}

// ─── Featured products ────────────────────────────────────────────────────────

/**
 * Returns featured products (is_featured = TRUE), limited to `limit` rows.
 * RLS enforces is_active + non-archived.
 */
export async function getFeaturedProducts(
  limit: number = FEATURED_LIMIT,
): Promise<CatalogProductListItem[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('is_featured', true)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) throw toCatalogError(error, 'featured products');

  return (data ?? []).map((row) => mapProductListItem(row as unknown as ProductListRow));
}

// ─── Best sellers ─────────────────────────────────────────────────────────────

/**
 * Returns best-seller products (is_best_seller = TRUE), limited to `limit` rows.
 */
export async function getBestSellerProducts(
  limit: number = BEST_SELLER_LIMIT,
): Promise<CatalogProductListItem[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('is_best_seller', true)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) throw toCatalogError(error, 'best sellers');

  return (data ?? []).map((row) => mapProductListItem(row as unknown as ProductListRow));
}

// ─── Product detail ───────────────────────────────────────────────────────────

/**
 * Returns full product detail for a single product, including images and compositions.
 * Returns null if product is not found, inactive, or archived.
 */
export async function getProductById(id: string): Promise<CatalogProductDetail | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, slug, sku, pack_size, description, uses,
      mrp_paise, selling_price_paise, is_featured, is_best_seller,
      category_id, brand_id, manufacturer_id,
      brands ( name ),
      manufacturers ( name ),
      product_images ( id, image_url, alt_text, display_order, is_primary ),
      product_compositions ( id, composition_name, strength, display_order )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw toCatalogError(error, 'product detail');
  if (!data) return null;

  const rawImages = (data.product_images as Array<{
    id: string;
    image_url: string;
    alt_text: string | null;
    display_order: number;
    is_primary: boolean;
  }> ?? []).sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  const rawCompositions = (data.product_compositions as Array<{
    id: string;
    composition_name: string;
    strength: string | null;
    display_order: number;
  }> ?? []).sort((a, b) => a.display_order - b.display_order);

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    sku: data.sku,
    packSize: data.pack_size,
    description: data.description,
    uses: data.uses,
    mrpPaise: data.mrp_paise,
    sellingPricePaise: data.selling_price_paise,
    isFeatured: data.is_featured,
    isBestSeller: data.is_best_seller,
    categoryId: data.category_id,
    brandId: data.brand_id,
    brandName: (data.brands as { name: string } | null)?.name ?? null,
    manufacturerId: data.manufacturer_id,
    manufacturerName: (data.manufacturers as { name: string } | null)?.name ?? null,
    images: rawImages.map((img) => ({
      id: img.id,
      imageUrl: img.image_url,
      altText: img.alt_text,
      displayOrder: img.display_order,
      isPrimary: img.is_primary,
    })),
    compositions: rawCompositions.map((c) => ({
      id: c.id,
      compositionName: c.composition_name,
      strength: c.strength,
      displayOrder: c.display_order,
    })),
  };
}

// ─── Product availability ─────────────────────────────────────────────────────

/**
 * Calls the get_product_availability() SECURITY DEFINER RPC.
 * Returns null if product is not found.
 * Does NOT query inventory_transactions directly.
 */
export async function getProductAvailability(productId: string): Promise<ProductAvailability | null> {
  const { data, error } = await supabase.rpc('get_product_availability', {
    p_product_id: productId,
  });

  if (error) throw toCatalogError(error, 'product availability');

  const row = data?.[0];
  if (!row) return null;

  return {
    productId: row.product_id,
    isAvailable: row.is_available,
    availableQuantity: row.available_quantity,
    isLowStock: row.is_low_stock,
  };
}

// ─── Banners ──────────────────────────────────────────────────────────────────

/**
 * Returns active, in-window promotional banners ordered by display_order.
 * RLS policy already filters: is_active + starts_at/ends_at window.
 */
export async function getActiveBanners(): Promise<CatalogBanner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('id, title, image_url, link_type, link_value, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw toCatalogError(error, 'banners');

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    linkType: row.link_type as BannerLinkType,
    linkValue: row.link_value,
    displayOrder: row.display_order,
  }));
}

// ─── Product search ───────────────────────────────────────────────────────────

/**
 * Full-text search using the products.search_vector tsvector column.
 * Uses websearch_to_tsquery for safe, user-friendly query parsing.
 * Returns a paginated result.
 */
export async function searchProducts(
  query: string,
  offset: number = 0,
  pageSize: number = CATALOG_PAGE_SIZE,
): Promise<CatalogPage<CatalogProductListItem>> {
  const trimmed = query.trim();
  if (!trimmed) return { items: [], nextOffset: null };

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .textSearch('search_vector', trimmed, { type: 'websearch', config: 'english' })
    .order('name', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) throw toCatalogError(error, 'search');

  const items = (data ?? []).map((row) => mapProductListItem(row as unknown as ProductListRow));
  const nextOffset = items.length === pageSize ? offset + pageSize : null;

  return { items, nextOffset };
}

/**
 * Lightweight search for name suggestions (typeahead).
 * Returns only id, name, pack_size — no images, no inventory.
 */
export async function getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from('products')
    .select('id, name, pack_size')
    .textSearch('search_vector', trimmed, { type: 'websearch', config: 'english' })
    .order('name', { ascending: true })
    .limit(SUGGESTIONS_LIMIT);

  if (error) throw toCatalogError(error, 'search suggestions');

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    packSize: row.pack_size,
  }));
}

// ─── Similar products ─────────────────────────────────────────────────────────

/**
 * Returns products from the same category, excluding the current product.
 * Simple heuristic: same category_id, alphabetical order, limited.
 */
export async function getSimilarProducts(
  productId: string,
  categoryId: string,
  limit: number = SIMILAR_LIMIT,
): Promise<CatalogProductListItem[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_LIST_SELECT)
    .eq('category_id', categoryId)
    .neq('id', productId)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) throw toCatalogError(error, 'similar products');

  return (data ?? []).map((row) => mapProductListItem(row as unknown as ProductListRow));
}
