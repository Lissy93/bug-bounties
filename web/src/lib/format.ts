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

/**
 * Return the homepage URL if the program URL is not already the homepage
 * and is not on a bounty platform. Returns null otherwise.
 */
export function getHomepageUrl(url: string): string | null {
  const PLATFORM_HOSTS = [
    'hackerone.com', 'bugcrowd.com', 'intigriti.com', 'yeswehack.com',
    'synack.com', 'cobalt.io', 'federacy.com', 'immunefi.com',
  ];

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname;

  // Skip bounty platforms
  if (PLATFORM_HOSTS.some(p => host === p || host.endsWith('.' + p))) {
    return null;
  }

  // Strip www
  const bare = host.startsWith('www.') ? host.slice(4) : host;
  const hasPath = parsed.pathname.replace(/\/+$/, '').length > 0;
  const hasSubdomain = bare !== host && ('www.' + bare) !== host;

  if (!hasPath && !hasSubdomain) return null;

  return `https://${bare}`;
}
