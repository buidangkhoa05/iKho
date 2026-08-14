/** Formats a plain number as a euro amount, e.g. 42180 -> "€ 42,180" — matches the app's existing placeholder copy. */
export function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString('en-US')}`;
}
