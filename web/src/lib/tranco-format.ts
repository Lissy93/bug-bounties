/**
 * Format a Tranco rank into a short label (e.g. "Top 1K").
 * Returns empty string for ranks > 100K (not meaningful enough to show).
 */
export function formatRankLabel(rank: number): string {
  if (rank <= 100) return 'Top 100';
  if (rank <= 1_000) return 'Top 1K';
  if (rank <= 10_000) return 'Top 10K';
  if (rank <= 100_000) return 'Top 100K';
  return '';
}

/**
 * Format a Tranco rank into a badge label for detail pages.
 */
export function formatRankBadge(rank: number): string {
  if (rank <= 100_000) return `${formatRankLabel(rank)} site`;
  return 'Top 1M site';
}
