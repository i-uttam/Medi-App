/**
 * Root layout — app entry point.
 *
 * Responsibilities:
 *  - Load fonts (blocks render until ready).
 *  - Provide TanStack Query client (singleton from lib/queryClient).
 *  - Wrap all navigation in AuthProvider.
 *  - Route protection: redirect based on auth status using useSegments.
 *  - Overlay InitializingScreen while auth state is resolving (prevents flash).
 */

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { InitializingScreen } from '@/components/screens/InitializingScreen';
import { Toast } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { setBaseUrl } from '@workspace/api-client-react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Prevent the splash screen from auto-hiding before fonts are loaded.
SplashScreen.preventAutoHideAsync();

// Set API base URL — Expo bundles run outside the web proxy and need absolute URLs.
if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

// ── Route protection ──────────────────────────────────────────────────────────

/**
 * Reacts to auth status changes and redirects to the appropriate route.
 *
 * Rules:
 *  initializing / profile_loading  → no redirect (overlay handles UX)
 *  unauthenticated                 → /(auth)/login  (if not already there)
 *  authenticated_active            → /(tabs)         (if still on auth screen)
 *  authenticated_blocked           → /(auth)/blocked
 *  authenticated_profile_error     → /(auth)/login  (force re-auth)
 */
function useRouteProtection() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Do not redirect while resolving — InitializingScreen covers the UI.
    if (status === 'initializing' || status === 'authenticated_profile_loading') return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const onBlockedScreen = segs.includes('blocked');

    switch (status) {
      case 'unauthenticated':
        if (!inAuthGroup) {
          router.replace('/(auth)/login');
        }
        break;

      case 'authenticated_active':
        // Replace so the user cannot Back-navigate to the auth screens.
        if (inAuthGroup && !onBlockedScreen) {
          router.replace('/(tabs)');
        }
        break;

      case 'authenticated_blocked':
        if (!onBlockedScreen) {
          // Replace so Back cannot reach commerce routes.
          router.replace('/(auth)/blocked');
        }
        break;

      case 'authenticated_profile_error':
        // Profile failed to load — always redirect to login regardless of current
        // segment so the user is never stuck on the OTP or any other screen.
        // The Supabase session persists; the user will re-auth and the retry
        // logic in loadProfileWithRetry will run again on next SIGNED_IN.
        router.replace('/(auth)/login');
        break;
    }
  }, [status, segments, router]);
}

// ── Navigation tree ───────────────────────────────────────────────────────────

function RootLayoutNav() {
  const { status } = useAuth();
  useRouteProtection();

  // Show the loading overlay while auth state is unresolved.
  // Rendered on top of the Stack so neither the login screen nor the home
  // screen flashes before the correct destination is known.
  const isResolving =
    status === 'initializing' || status === 'authenticated_profile_loading';

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        {/* OTP and blocked screens use replace-style navigation — disable Back gesture */}
        <Stack.Screen name="(auth)/blocked" options={{ gestureEnabled: false }} />
        <Stack.Screen name="search/index" options={{ animation: 'fade' }} />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="cart/index" />
        <Stack.Screen name="addresses/index" />
        <Stack.Screen name="addresses/create" />
        <Stack.Screen name="addresses/[id]/edit" />
        <Stack.Screen name="checkout/index" />
        {/* gestureEnabled: false — user cannot go back from order success */}
        <Stack.Screen name="order/success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="order/[id]" />
        <Stack.Screen name="notifications/index" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="support/index" />
      </Stack>

      {/* Global toast overlay — renders on top of all navigation */}
      <Toast />

      {/* Auth initialization overlay — prevents flash of wrong screen */}
      {isResolving && <InitializingScreen />}
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
