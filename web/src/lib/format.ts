export function formatPayout(min?: number, max?: number, currency?: string): string | null {
  if (min == null && max == null) return null;
  const cur = currency || 'USD';
  if (min != null && max != null) return `${cur} $${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (max != null) return `Up to ${cur} $${max.toLocaleString()}`;
  if (min != null) return `From ${cur} $${min.toLocaleString()}`;
  return null;
}

export function formatDuration(days?: number): string | null {
  if (days == null) return null;
  if (days < 1) return 'Less than a day';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
