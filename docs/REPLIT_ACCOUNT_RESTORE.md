# Replit Account Restoration Guide

Follow these steps exactly when importing this project into a new Replit account.

**Assumptions:**
- You have changed Replit accounts.
- The complete code exists in a private GitHub repository.
- The same real Supabase project is being reused (do not create a new one).
- Migrations 001–026 are already applied to the remote Supabase database.
- RLS, RBAC, and the Super Admin are already deployed.
- You do **not** want to recreate or reset the database.

---

## Step 1 — Sign In to the New Replit Account

Log in at [https://replit.com](https://replit.com).

---

## Step 2 — Import the Private GitHub Repository

1. From the Replit dashboard, click **+ Create Repl** → **Import from GitHub**.
2. Authorize GitHub access if prompted.
3. Select the private repository (`Medi-App` or whatever it is named).
4. Replit will clone the repository and open the workspace.

---

## Step 3 — Install Dependencies

Open the Replit Shell and run:

```bash
pnpm install
```

This uses `pnpm-lock.yaml` from the repository to reproduce the exact same dependency tree.

---

## Step 4 — Review `.env.example`

```bash
cat .env.example
```

Note which variables are required. The next step adds them to Replit Secrets.

---

## Step 5 — Add Required Secrets to Replit

Open **Replit → Secrets** (the padlock icon in the sidebar) and add:

### Always required (mobile app + API server)

```
EXPO_PUBLIC_SUPABASE_URL       = https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = <your-anon-public-key>
SESSION_SECRET                 = <generate: openssl rand -base64 32>
```

Find `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` at:
**Supabase Dashboard → Project Settings → API**

Generate `SESSION_SECRET` with:
```bash
openssl rand -base64 32
```

### Required only for Supabase CLI operations (migrations, type generation)

```
SUPABASE_ACCESS_TOKEN  = <from Supabase Dashboard → Account → Access Tokens>
SUPABASE_DB_PASSWORD   = <from Supabase Dashboard → Project Settings → Database>
SUPABASE_PROJECT_ID    = <from Supabase Dashboard → Project Settings → General → Reference ID>
```

> ⚠️ **NEVER** add `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, or `SUPABASE_SERVICE_ROLE_KEY` to any `EXPO_PUBLIC_*` variable.

---

## Step 6 — Verify the Supabase Project

Run the project health check:

```bash
pnpm run check:setup
```

All items should show `PASS`. `OPTIONAL` items for Supabase CLI will show `MISSING` if you did not add CLI secrets — this is expected if you only need to run the app.

---

## Step 7 — Configure the API Server Workflow

In Replit, verify the **API Server** workflow is configured:

- **Name:** API Server
- **Command:** `PORT=8080 pnpm --filter @workspace/api-server run dev`

Start the workflow and confirm the health check:

```bash
curl http://localhost:8080/api/healthz
# Expected: {"status":"ok"}
```

---

## Step 8 — Link the Supabase Project (CLI — Optional)

Only if you need to run Supabase CLI commands (migrations, type generation).

```bash
# Authenticate the CLI
supabase login --token "$SUPABASE_ACCESS_TOKEN"

# Link to the existing project (does NOT modify the database)
supabase link --project-ref "$SUPABASE_PROJECT_ID" --password "$SUPABASE_DB_PASSWORD"
```

---

## Step 9 — Verify Migration State (CLI — Do Not Push)

```bash
# List applied migrations — confirm all 26 are present
supabase migration list

# Do NOT run:
# supabase db push       ← only if new migrations were added
# supabase db reset      ← DESTROYS ALL DATA — never run this
```

Expected output: migrations 001 through 026 listed as **APPLIED**.

---

## Step 10 — Generate Database Types (CLI — Optional)

Only run if the Supabase schema changed since the last type generation. The committed `lib/database.types.ts` is current.

```bash
supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_ID" \
  --schema public \
  > lib/database.types.ts
```

---

## Step 11 — Verify the Mobile App

Start the customer app:

```bash
pnpm --filter @workspace/customer-app run dev
```

Verify in the Replit preview:
- App loads without errors.
- `InitializingScreen` shows briefly, then transitions to the Login screen.
- The Supabase client does not log missing-env warnings.

---

## Step 12 — Verify Authentication Architecture

1. Enter a valid Indian mobile number on the Login screen.
2. Confirm the Continue button enters a loading state (not instant navigation).
3. If Supabase phone auth is configured: an SMS is sent → enter the OTP.
4. On success: navigates to the home screen; cannot Back to Login.
5. Open Profile tab → confirm name/phone shows (or "Complete your profile" if no name set).
6. Log Out → confirm return to Login; Back does not re-enter the app.

If SMS provider is not yet configured in the Supabase dashboard, see `docs/PHONE_AUTH_SETUP.md`.

---

## Step 13 — Continue Development

Read `docs/PROJECT_STATE.md` to understand current progress and the recommended next step.

---

## What Has Already Been Done (Do Not Redo)

| Item | Status |
|---|---|
| Migrations 001–026 | ✅ Applied to remote Supabase |
| RLS + FORCE RLS | ✅ Deployed |
| RBAC | ✅ Deployed |
| Secure RPCs | ✅ Deployed |
| Super Admin bootstrap | ✅ Complete — **do not rerun** |
| Database types generation | ✅ Current at `lib/database.types.ts` |
| Mobile UI foundation | ✅ Complete |
| Customer auth (phone OTP) | ✅ Implemented |

---

## Danger Zone — Never Do This

```bash
# NEVER run these commands on the production Supabase project:
supabase db reset                    # destroys all data
supabase db push --force             # only if you know exactly what will change
# NEVER run the Super Admin bootstrap script again
# NEVER add SUPABASE_ACCESS_TOKEN to EXPO_PUBLIC_* variables
```
