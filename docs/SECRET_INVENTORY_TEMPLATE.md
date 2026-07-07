# Secret Inventory Template

**PURPOSE:** This document lists the **names** of required secrets and where to retrieve them.
It does **not** contain and must **never** contain real secret values.

After importing this project into a new Replit account, use this document to know exactly which secrets to add and where to find them.

---

## Required Secrets

### 1. `EXPO_PUBLIC_SUPABASE_URL`

| Field | Value |
|---|---|
| Purpose | Supabase project URL for the customer mobile app |
| Sensitive | NO — anon-safe; baked into the Expo bundle |
| Required by mobile runtime | **YES** |
| Required by admin runtime | If admin app uses Supabase direct |
| Required by Supabase CLI | NO |
| Where to retrieve | Supabase Dashboard → Project Settings → API → Project URL |
| Format | `https://<project-ref>.supabase.co` |
| Re-configure after account change | **YES** — add to Replit Secrets |

---

### 2. `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

| Field | Value |
|---|---|
| Purpose | Supabase anon/public key for the customer mobile app |
| Sensitive | LOW — public key subject to RLS; safe in client bundles |
| Required by mobile runtime | **YES** |
| Required by admin runtime | If admin app uses Supabase direct |
| Required by Supabase CLI | NO |
| Where to retrieve | Supabase Dashboard → Project Settings → API → `anon` / `public` key |
| Re-configure after account change | **YES** — add to Replit Secrets |

> ⚠️ This is the `anon` key. It is NOT the `service_role` key. Never use `service_role` here.

---

### 3. `SESSION_SECRET`

| Field | Value |
|---|---|
| Purpose | Signs Express session cookies for the API server |
| Sensitive | YES — treat as a secret |
| Required by mobile runtime | NO |
| Required by admin runtime | NO |
| Required by Supabase CLI | NO |
| Required by API server | **YES** |
| Where to retrieve | Generate a new value: `openssl rand -base64 32` |
| Re-configure after account change | **YES** — generate a new value and add to Replit Secrets |

---

### 4. `SUPABASE_ACCESS_TOKEN`

| Field | Value |
|---|---|
| Purpose | Authenticates the Supabase CLI for non-interactive operations |
| Sensitive | YES — personal access token; treat like a password |
| Required by mobile runtime | **NO** — must never be exposed to Expo |
| Required by admin runtime | NO |
| Required by Supabase CLI | **YES** (only if running `supabase db push`, `supabase gen types`, etc.) |
| Where to retrieve | Supabase Dashboard → Account → Access Tokens → Generate new token |
| Re-configure after account change | **YES** — if CLI operations are needed |

> ⚠️ NEVER add to `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variables.

---

### 5. `SUPABASE_DB_PASSWORD`

| Field | Value |
|---|---|
| Purpose | Database password for `supabase db push` / `supabase link` |
| Sensitive | YES — database credential |
| Required by mobile runtime | **NO** — must never be exposed to Expo |
| Required by admin runtime | NO |
| Required by Supabase CLI | **YES** (only if running `supabase db push` or `supabase link`) |
| Where to retrieve | Supabase Dashboard → Project Settings → Database → Database password |
| Re-configure after account change | **YES** — if CLI operations are needed |

> ⚠️ NEVER add to `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variables.

---

### 6. `SUPABASE_PROJECT_ID`

| Field | Value |
|---|---|
| Purpose | Supabase project reference ID for CLI linking |
| Sensitive | LOW — project identifier, not a credential |
| Required by mobile runtime | NO |
| Required by Supabase CLI | **YES** — used in `supabase link --project-ref` |
| Where to retrieve | Supabase Dashboard → Project Settings → General → Reference ID |
| Format | 20-character alphanumeric string |
| Re-configure after account change | **YES** — add to Replit Secrets or use directly in CLI commands |

---

### 7. `SUPABASE_SERVICE_ROLE_KEY` *(future use)*

| Field | Value |
|---|---|
| Purpose | Server-side operations that bypass RLS (Edge Functions, admin API) |
| Sensitive | **CRITICAL** — bypasses all RLS; full database access |
| Required by mobile runtime | **NEVER** |
| Required by admin runtime | Only in server-side context (Edge Functions, trusted server) |
| Required by Supabase CLI | NO |
| Where to retrieve | Supabase Dashboard → Project Settings → API → `service_role` key |
| Re-configure after account change | Only if server-side admin features are implemented |

> ⛔ NEVER add to `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variables.
> ⛔ NEVER include in mobile app bundles.

---

## Summary: What to Configure Immediately After Import

| Secret | Action |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Add to Replit Secrets — **required to run mobile app** |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Add to Replit Secrets — **required to run mobile app** |
| `SESSION_SECRET` | Generate new value, add to Replit Secrets — **required for API server** |
| `SUPABASE_ACCESS_TOKEN` | Add to Replit Secrets only if you plan to run CLI commands |
| `SUPABASE_DB_PASSWORD` | Add to Replit Secrets only if you plan to run CLI commands |
| `SUPABASE_PROJECT_ID` | Add to Replit Secrets only if you plan to run CLI commands |
