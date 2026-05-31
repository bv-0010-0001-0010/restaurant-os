// Formats integer cents as AUD currency, e.g. 452300 -> "$4,523.00".
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100);
}
