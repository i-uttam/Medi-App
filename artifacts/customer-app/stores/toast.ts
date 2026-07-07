/**
 * Global toast/feedback store — Zustand.
 * Use the useToast() hook in components to show feedback messages.
 */

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastEntry {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastEntry[];
  showToast: (message: string, type?: ToastType) => void;
  hideToast: (id: string) => void;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  showToast: (message, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },

  hideToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience hook — call in components to trigger toasts. */
export function useToast() {
  const { showToast } = useToastStore();
  return {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    info: (msg: string) => showToast(msg, 'info'),
    warning: (msg: string) => showToast(msg, 'warning'),
  };
}
