export function formatPayout(
  min?: number,
  max?: number,
  currency?: string,
): string | null {
  if (min == null && max == null) return null;
  const cur = currency || "USD";
  if (min != null && max != null)
    return `${cur} $${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (max != null) return `Up to ${cur} $${max.toLocaleString()}`;
  if (min != null) return `From ${cur} $${min.toLocaleString()}`;
  return null;
}

export function formatDuration(days?: number): string | null {
  if (days == null) return null;
  if (days < 1) return "Less than a day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function formatPayoutTable(
  table?: { critical?: number; high?: number; medium?: number; low?: number },
  currency?: string,
): { severity: string; amount: string }[] | null {
  if (!table) return null;
  const cur = currency || "USD";
  const rows: { severity: string; amount: string }[] = [];
  for (const [sev, val] of [
    ["Critical", table.critical],
    ["High", table.high],
    ["Medium", table.medium],
    ["Low", table.low],
  ] as const) {
    if (val != null && val > 0) {
      rows.push({ severity: sev, amount: `${cur} $${val.toLocaleString()}` });
    }
  }
  return rows.length ? rows : null;
}

import { PLATFORM_HOSTNAMES } from "./domain";

export function formatExcludedMethod(method: string): string {
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Return the homepage URL if the program URL is not already the homepage
 * and is not on a bounty platform. Returns null otherwise.
 */
export function getHomepageUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname;

  // Skip bounty platforms
  for (const p of PLATFORM_HOSTNAMES) {
    if (host === p || host.endsWith("." + p)) return null;
  }

  // Strip www
  const bare = host.startsWith("www.") ? host.slice(4) : host;
  const hasPath = parsed.pathname.replace(/\/+$/, "").length > 0;
  const dotCount = bare.split(".").length - 1;
  const hasSubdomain = dotCount > 1;

  if (!hasPath && !hasSubdomain) return null;

  return `https://${bare}`;
}
