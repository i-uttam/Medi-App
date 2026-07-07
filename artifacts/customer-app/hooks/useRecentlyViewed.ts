/**
 * Recently-viewed products — persisted to AsyncStorage.
 *
 * Stores lightweight product stubs (id + name) so the home screen can show
 * a "Recently Viewed" section without a network call.
 * Full product data is still fetched on demand when the user taps a card.
 *
 * Keeps up to MAX_ITEMS entries, newest first.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'medigo:recently-viewed-v1';
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  id: string;
  name: string;
  packSize: string | null;
  primaryImageUrl: string | null;
  sellingPricePaise: number;
  mrpPaise: number;
  inStock: boolean;
  viewedAt: number; // epoch ms
}

async function loadFromStorage(): Promise<RecentlyViewedItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveToStorage(items: RecentlyViewedItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Non-critical — silently ignore.
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFromStorage().then((stored) => {
      setItems(stored);
      setLoaded(true);
    });
  }, []);

  const recordView = useCallback((product: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    setItems((prev) => {
      const without = prev.filter((i) => i.id !== product.id);
      const next = [{ ...product, viewedAt: Date.now() }, ...without].slice(0, MAX_ITEMS);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    saveToStorage([]);
  }, []);

  return { items, loaded, recordView, clearAll };
}
