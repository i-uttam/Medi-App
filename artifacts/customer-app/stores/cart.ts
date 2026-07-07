/**
 * Cart store — Zustand + AsyncStorage persistence.
 *
 * Stores cart items locally. Future: sync with server cart via Supabase RPC
 * after the order engine is implemented.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  quantity: number;
  /** Snapshot price at time of add (paise). Refreshed on checkout. */
  pricePaise?: number;
  name?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (productId: string, meta?: Pick<CartItem, 'pricePaise' | 'name'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getQuantity: (productId: string) => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId, meta) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          return { items: [...state.items, { productId, quantity: 1, ...meta }] };
        }),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i,
                ),
        })),

      clearCart: () => set({ items: [] }),

      getQuantity: (productId) =>
        get().items.find((i) => i.productId === productId)?.quantity ?? 0,

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'medigo-cart-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
