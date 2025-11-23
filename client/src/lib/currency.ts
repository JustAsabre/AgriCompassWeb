export function formatCurrency(value: number | string | undefined | null) {
  const v = Number(value) || 0;
  try {
    // Use Intl.NumberFormat for Ghana cedi currency formatting
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(v);
  } catch (err) {
    // Fallback to simple formatting with GH₵ prefix
    return `GH₵${v.toFixed(2)}`;
  }
}
