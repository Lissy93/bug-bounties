export function formatRankLabel(rank: number): string {
  if (rank <= 100) return "Top 100";
  if (rank <= 1_000) return "Top 1K";
  if (rank <= 10_000) return "Top 10K";
  if (rank <= 100_000) return "Top 100K";
  if (rank <= 1_000_000) return "Top 1M";
  return "";
}

export function formatRankBadge(rank: number): string {
  const label = formatRankLabel(rank);
  return label ? `${label} site` : "";
}
