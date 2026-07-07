/**
 * Indian Rupee formatting utilities for MediGo.
 *
 * All prices in the database are stored as paise (integers).
 * Display formatting converts paise → rupees for the UI.
 */

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format paise (integer) as ₹ string — e.g. 9900 → "₹99" */
export function formatPaise(paise: number): string {
  return INR_FORMATTER.format(paise / 100);
}

/** Format whole rupees as ₹ string — e.g. 99 → "₹99" */
export function formatRupees(rupees: number): string {
  return INR_FORMATTER.format(rupees);
}

/** Calculate discount percentage. Returns 0 if no discount. */
export function discountPercent(mrpPaise: number, sellingPaise: number): number {
  if (mrpPaise <= 0 || sellingPaise >= mrpPaise) return 0;
  return Math.round(((mrpPaise - sellingPaise) / mrpPaise) * 100);
}
