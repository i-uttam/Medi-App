#!/usr/bin/env node
/**
 * MediGo — Project Setup Health Check
 *
 * Verifies the project is correctly set up after cloning / account migration.
 *
 * Rules:
 *  - Does NOT modify the database.
 *  - Does NOT push migrations.
 *  - Does NOT reset Supabase.
 *  - Does NOT print secret values.
 *
 * Usage:
 *   pnpm run check:setup
 */

import { existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// ── Colours ────────────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE   = '\x1b[34m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

const PASS     = `${GREEN}  PASS    ${RESET}`;
const MISSING  = `${RED}  MISSING ${RESET}`;
const OPTIONAL = `${YELLOW}  OPTIONAL${RESET}`;

let passCount    = 0;
let missingCount = 0;
let optCount     = 0;

function check(label, ok, required = true) {
  if (ok) {
    console.log(`${PASS} ${label}`);
    passCount++;
  } else if (required) {
    console.log(`${MISSING} ${label}`);
    missingCount++;
  } else {
    console.log(`${OPTIONAL} ${label}`);
    optCount++;
  }
}

function checkEnv(name, required = true) {
  const present = !!process.env[name];
  const label = `env: ${name}${present ? '' : ' — not set'}`;
  check(label, present, required);
}

function section(title) {
  console.log(`\n${BOLD}${BLUE}── ${title} ─────────────────────────────────${RESET}`);
}

const root = resolve(import.meta.dirname, '..');

// ── SECTION: Required directories ─────────────────────────────────────────────
section('Required Directories');

const requiredDirs = [
  'supabase/migrations',
  'supabase/tests',
  'lib',
  'docs',
  'artifacts/customer-app/app',
  'artifacts/customer-app/features/auth',
  'artifacts/customer-app/providers',
  'artifacts/customer-app/components',
  'artifacts/customer-app/constants',
  'artifacts/customer-app/hooks',
  'artifacts/customer-app/stores',
  'artifacts/api-server/src',
];

for (const dir of requiredDirs) {
  check(dir, existsSync(join(root, dir)));
}

// ── SECTION: Migrations ────────────────────────────────────────────────────────
section('Database Migrations');

const migrationsDir = join(root, 'supabase/migrations');
let migrationCount = 0;
if (existsSync(migrationsDir)) {
  migrationCount = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).length;
}
check(`supabase/migrations/ exists`, existsSync(migrationsDir));
check(`Migration count ≥ 26 (found ${migrationCount})`, migrationCount >= 26);

const lastMigration = join(migrationsDir, '026_fix_admin_update_app_setting_signature.sql');
check(`Last known migration (026) present`, existsSync(lastMigration));

// ── SECTION: Database types ────────────────────────────────────────────────────
section('Database Types');

check('lib/database.types.ts', existsSync(join(root, 'lib/database.types.ts')));

// ── SECTION: Supabase client + auth ───────────────────────────────────────────
section('Supabase Client & Auth Architecture');

const authFiles = [
  'artifacts/customer-app/lib/supabase.ts',
  'artifacts/customer-app/lib/queryClient.ts',
  'artifacts/customer-app/features/auth/types/index.ts',
  'artifacts/customer-app/features/auth/utils/phone.ts',
  'artifacts/customer-app/features/auth/utils/errors.ts',
  'artifacts/customer-app/features/auth/api/auth.ts',
  'artifacts/customer-app/providers/AuthProvider.tsx',
  'artifacts/customer-app/app/(auth)/login.tsx',
  'artifacts/customer-app/app/(auth)/verify-otp.tsx',
  'artifacts/customer-app/app/(auth)/blocked.tsx',
  'artifacts/customer-app/app/_layout.tsx',
];

for (const f of authFiles) {
  check(f, existsSync(join(root, f)));
}

// ── SECTION: App configuration ─────────────────────────────────────────────────
section('App Configuration');

const configFiles = [
  'artifacts/customer-app/app.json',
  'artifacts/customer-app/babel.config.js',
  'artifacts/customer-app/metro.config.js',
  'artifacts/customer-app/tsconfig.json',
  'artifacts/customer-app/package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'package.json',
];

for (const f of configFiles) {
  check(f, existsSync(join(root, f)));
}

// ── SECTION: Dependencies installed ───────────────────────────────────────────
section('Dependencies');

check(
  'node_modules installed (root)',
  existsSync(join(root, 'node_modules')),
);
check(
  'customer-app node_modules installed',
  existsSync(join(root, 'artifacts/customer-app/node_modules')),
);

// ── SECTION: Documentation ────────────────────────────────────────────────────
section('Documentation');

const docFiles = [
  'docs/PRD.md',
  'docs/DATABASE_ARCHITECTURE.md',
  'docs/SECURITY_ARCHITECTURE.md',
  'docs/AUTH_ARCHITECTURE.md',
  'docs/PHONE_AUTH_SETUP.md',
  'docs/PROJECT_STATE.md',
  'docs/SECRET_INVENTORY_TEMPLATE.md',
  'docs/REPLIT_ACCOUNT_RESTORE.md',
  'AGENTS.md',
];

for (const f of docFiles) {
  check(f, existsSync(join(root, f)));
}

// ── SECTION: Environment variables ────────────────────────────────────────────
section('Environment Variables (Replit Secrets)');

// Mobile app — required to run
checkEnv('EXPO_PUBLIC_SUPABASE_URL', true);
checkEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', true);

// API server — required to run
checkEnv('SESSION_SECRET', true);

// Supabase CLI — optional (only needed for migrations / type generation)
checkEnv('SUPABASE_ACCESS_TOKEN', false);
checkEnv('SUPABASE_DB_PASSWORD', false);
checkEnv('SUPABASE_PROJECT_ID', false);

// ── SECTION: Security ─────────────────────────────────────────────────────────
section('Security Checks');

// Verify .env.example exists (safe — empty values)
check('.env.example present', existsSync(join(root, '.env.example')));

// Verify .env is not tracked (it should be gitignored)
const gitignorePath = join(root, '.gitignore');
if (existsSync(gitignorePath)) {
  const gitignoreContent = (await import('fs')).readFileSync(gitignorePath, 'utf8');
  check('.env is in .gitignore', gitignoreContent.includes('.env'));
  check('.env.local is in .gitignore', gitignoreContent.includes('.env.local'));
}

// ── SUMMARY ───────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}── Summary ──────────────────────────────────────${RESET}`);
console.log(`${GREEN}  PASS:    ${passCount}${RESET}`);
if (missingCount > 0) {
  console.log(`${RED}  MISSING: ${missingCount}${RESET}`);
}
if (optCount > 0) {
  console.log(`${YELLOW}  OPTIONAL:${optCount} (CLI secrets — not needed to run the app)${RESET}`);
}

if (missingCount === 0) {
  console.log(`\n${GREEN}${BOLD}✓ Project setup is complete. Ready to run.${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n${RED}${BOLD}✗ ${missingCount} required item(s) missing. Review the output above.${RESET}`);
  console.log(`${YELLOW}  See docs/REPLIT_ACCOUNT_RESTORE.md for setup instructions.${RESET}\n`);
  process.exit(1);
}
