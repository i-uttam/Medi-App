# Storage Security Plan
## Online Pharmacy Platform — Supabase Storage

**Version:** 1.0  
**Last Updated:** 2026-07-07  
**Status:** Planned — Buckets require manual creation in Supabase Dashboard

---

## Overview

Supabase Storage is used for user-generated content (avatars) and admin-managed content (product images, category images, brand images, banner images). Storage policies are separate from database RLS policies and are managed independently in the Supabase Dashboard.

**IMPORTANT:** There is no prescription image bucket. This platform operates COD-only with no prescription verification.

---

## Required Buckets

| Bucket Name | Public | Purpose | Who Uploads |
|---|---|---|---|
| `product-images` | ✅ Yes | Product photographs | Admins only |
| `category-images` | ✅ Yes | Category icons/covers | Admins only |
| `brand-images` | ✅ Yes | Brand logos | Admins only |
| `banner-images` | ✅ Yes | Home screen banners | Admins only |
| `avatars` | ❌ No | Customer profile photos | Customers (own avatar only) |

---

## Bucket Creation (Manual — Human Action Required)

Buckets cannot be created via SQL migrations. They must be created manually:

**Supabase Dashboard → Storage → New Bucket**

Create each bucket with these settings:

### `product-images`
- **Public:** Yes
- **File size limit:** 5 MB
- **Allowed MIME types:** `image/jpeg, image/png, image/webp`

### `category-images`
- **Public:** Yes
- **File size limit:** 2 MB
- **Allowed MIME types:** `image/jpeg, image/png, image/webp, image/svg+xml`

### `brand-images`
- **Public:** Yes
- **File size limit:** 2 MB
- **Allowed MIME types:** `image/jpeg, image/png, image/webp, image/svg+xml`

### `banner-images`
- **Public:** Yes
- **File size limit:** 10 MB
- **Allowed MIME types:** `image/jpeg, image/png, image/webp`

### `avatars`
- **Public:** No
- **File size limit:** 2 MB
- **Allowed MIME types:** `image/jpeg, image/png, image/webp`

---

## Storage Policies (After Bucket Creation)

### `product-images` Policies

```sql
-- Public read (everyone can see product images)
CREATE POLICY "product-images: public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Admin upload only (requires products.update permission)
-- NOTE: Storage policies cannot call custom DB functions directly.
-- Implement via check that the user is in admin_users:
CREATE POLICY "product-images: admin upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "product-images: admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "product-images: admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND status = 'active'
    )
);
```

Apply the same admin pattern to `category-images`, `brand-images`, and `banner-images`.

### `avatars` Policies

Avatar path convention: `avatars/{user_id}/{filename}`

This ensures customers can only overwrite their own avatar and cannot see others'.

```sql
-- Customers read only their own avatar
CREATE POLICY "avatars: owner read"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Customers upload/update only their own avatar
CREATE POLICY "avatars: owner upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "avatars: owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

CREATE POLICY "avatars: owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- Admins can read avatars (for customer support)
CREATE POLICY "avatars: admin read"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'avatars'
    AND EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND status = 'active'
    )
);
```

---

## Implementation Status

| Bucket | Created | Policies Applied |
|---|---|---|
| `product-images` | ❌ Pending human action | ❌ Pending |
| `category-images` | ❌ Pending human action | ❌ Pending |
| `brand-images` | ❌ Pending human action | ❌ Pending |
| `banner-images` | ❌ Pending human action | ❌ Pending |
| `avatars` | ❌ Pending human action | ❌ Pending |

---

## Human Actions Required

1. Log into Supabase Dashboard → Storage
2. Create all 5 buckets listed above with specified settings
3. Apply all storage policies via the Supabase SQL Editor (paste the policy SQL above)
4. Verify each bucket's RLS is enabled
5. Test upload with a dummy admin user session
6. Test cross-user access is denied for avatars

---

## Notes

- Storage policies live in the `storage.objects` table, not in `public` schema RLS.
- Supabase auto-generates signed URLs for private bucket reads when using the Supabase client SDK.
- The `storage.foldername()` function extracts folder segments from the object path for path-based access control.
- Do NOT create a `prescriptions` bucket — this platform has no prescription verification feature.
- Product image URLs stored in `product_images.image_url` should reference the public Supabase Storage URL format: `https://<project-ref>.supabase.co/storage/v1/object/public/product-images/<path>`.
