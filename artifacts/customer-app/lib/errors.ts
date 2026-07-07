/**
 * Centralized user-facing error message mapping.
 *
 * NEVER surface raw Supabase errors, PostgreSQL messages, or stack traces to users.
 * All UI error states must go through this module.
 */

const MESSAGES: Record<string, string> = {
  network_error: 'No internet connection. Please check your network.',
  timeout: 'Request timed out. Please try again.',
  not_found: "We couldn't find what you were looking for.",
  unauthorized: 'Please sign in to continue.',
  forbidden: "You don't have permission to do this.",
  server_error: 'Something went wrong on our end. Please try again.',
  validation_error: 'Please check your input and try again.',
  otp_invalid: 'The code you entered is incorrect. Please try again.',
  otp_expired: 'This code has expired. Please request a new one.',
  phone_invalid: 'Please enter a valid 10-digit phone number.',
  stock_unavailable: 'This item is currently out of stock.',
  cart_error: 'Unable to update your cart. Please try again.',
  address_error: 'Unable to save address. Please try again.',
  order_error: 'Unable to place your order. Please try again.',
};

export function getUserFacingError(error: unknown): string {
  if (!error) return MESSAGES.server_error;

  if (typeof error === 'string') {
    return MESSAGES[error] ?? MESSAGES.server_error;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect')) {
      return MESSAGES.network_error;
    }
    if (msg.includes('timeout')) return MESSAGES.timeout;
    if (msg.includes('401') || msg.includes('unauthorized')) return MESSAGES.unauthorized;
    if (msg.includes('403') || msg.includes('forbidden')) return MESSAGES.forbidden;
    if (msg.includes('404') || msg.includes('not found')) return MESSAGES.not_found;
    if (msg.includes('otp') || msg.includes('token')) return MESSAGES.otp_invalid;
  }

  return MESSAGES.server_error;
}

export type AppError = keyof typeof MESSAGES;
