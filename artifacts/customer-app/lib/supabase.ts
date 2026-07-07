/**
 * Supabase client for MediGo customer mobile app.
 *
 * Uses EXPO_PUBLIC_ environment variables (safe for client bundles, subject to RLS).
 * Session is persisted via AsyncStorage so auth survives app restarts.
 *
 * Required Replit Secrets (set before using auth/data features):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * NEVER use SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ACCESS_TOKEN here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[MediGo] Supabase env vars not set.\n' +
      'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
      'to Replit Secrets before using auth or data features.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
