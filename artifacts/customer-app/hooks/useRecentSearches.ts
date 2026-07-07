/**
 * Recent search history — persisted to AsyncStorage.
 *
 * Stores up to MAX_RECENT unique search terms.
 * Adding a duplicate term moves it to the top.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'medigo:recent-searches-v1';
const MAX_RECENT = 10;

async function loadFromStorage(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

async function saveToStorage(terms: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
  } catch {
    // Silently ignore storage errors — search history is non-critical.
  }
}

export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFromStorage().then((stored) => {
      setSearches(stored);
      setLoaded(true);
    });
  }, []);

  const addSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearches((prev) => {
      const without = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...without].slice(0, MAX_RECENT);
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeSearch = useCallback((term: string) => {
    setSearches((prev) => {
      const next = prev.filter((s) => s !== term);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearSearches = useCallback(() => {
    setSearches([]);
    saveToStorage([]);
  }, []);

  return { searches, loaded, addSearch, removeSearch, clearSearches };
}
