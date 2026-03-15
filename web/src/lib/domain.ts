import type { BountyProgram } from "../types/Company";

export const PLATFORM_HOSTNAMES = new Set([
  "hackerone.com",
  "bugcrowd.com",
  "intigriti.com",
  "yeswehack.com",
  "synack.com",
  "cobalt.io",
  "federacy.com",
  "immunefi.com",
]);

// Two-part TLDs where the registrable domain is the last 3 segments
const TWO_PART_TLDS = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "co.jp",
  "or.jp",
  "ne.jp",
  "co.kr",
  "or.kr",
  "com.au",
  "org.au",
  "net.au",
  "com.br",
  "org.br",
  "net.br",
  "co.in",
  "org.in",
  "net.in",
  "co.nz",
  "org.nz",
  "net.nz",
  "co.za",
  "org.za",
  "net.za",
  "com.cn",
  "org.cn",
  "net.cn",
  "com.mx",
  "org.mx",
  "com.sg",
  "org.sg",
  "com.hk",
  "org.hk",
  "co.il",
]);

/**
 * Extract the registrable domain from a hostname.
 * e.g. "api.23andme.com" -> "23andme.com", "foo.co.uk" -> "foo.co.uk"
 */
function getRegistrableDomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;

  const lastTwo = parts.slice(-2).join(".");
  if (TWO_PART_TLDS.has(lastTwo)) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

function stripWww(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

// Domains that appear in many programs' scope as third-party services,
// not as the company's own domain. Only filtered when picking from the
// domains list (not when the program URL points directly to these).
const THIRD_PARTY_DOMAINS = new Set([
  "apple.com",
  "google.com",
  "github.com",
  "atlassian.com",
  "microsoft.com",
  "amazonaws.com",
  "cloudfront.net",
  "cloudflare.com",
  "sharepoint.com",
  "npmjs.com",
  "twitter.com",
]);

// Only valid hostname characters: letters, digits, hyphens, dots, and wildcards
const VALID_HOSTNAME_RE = /^[a-z0-9.*-]+$/i;

/**
 * Check if a domain entry is usable for logo fetching.
 * Rejects: free text, IP addresses, entries with invalid characters,
 * reverse-domain app IDs, and common third-party domains.
 */
function isCompanyDomain(entry: string): boolean {
  if (!VALID_HOSTNAME_RE.test(entry)) return false;
  if (!entry.includes(".")) return false;
  // Reject IP addresses
  if (/^[\d.]+$/.test(entry)) return false;
  // Reverse-domain app identifiers start with a generic TLD or known two-part TLD
  const parts = entry.split(".");
  if (parts.length >= 3) {
    const first = parts[0];
    if (
      first === "com" ||
      first === "org" ||
      first === "net" ||
      first === "io"
    ) {
      return false;
    }
    const firstTwo = parts.slice(0, 2).join(".");
    if (TWO_PART_TLDS.has(firstTwo)) {
      return false;
    }
  }
  const base = getRegistrableDomain(stripWww(entry));
  if (THIRD_PARTY_DOMAINS.has(base)) return false;
  return true;
}

function isPlatformHost(hostname: string): boolean {
  for (const platform of PLATFORM_HOSTNAMES) {
    if (hostname === platform || hostname.endsWith("." + platform)) {
      return true;
    }
  }
  return false;
}

/**
 * Derive the primary company domain from a program.
 * Unlike resolveLogoDomain, this returns a registrable domain suitable for
 * security.txt lookups and Tranco rank checks.
 */
export function resolvePrimaryDomain(program: BountyProgram): string | null {
  // First try the program URL directly if it's not a platform
  let hostname = "";
  try {
    hostname = new URL(program.url).hostname;
  } catch {
    return null;
  }

  if (!isPlatformHost(hostname)) {
    return getRegistrableDomain(stripWww(hostname));
  }

  // For platform-hosted programs, look through domains list
  if (program.domains) {
    const webDomain = program.domains.find(isCompanyDomain);
    if (webDomain) {
      return getRegistrableDomain(stripWww(webDomain));
    }
  }

  return null;
}

/**
 * Resolve the best domain to use for logo fetching.
 * Returns null if no reliable domain is available (platform URL with no domains data).
 */
export function resolveLogoDomain(program: BountyProgram): string | null {
  let hostname = "";
  try {
    hostname = new URL(program.url).hostname;
  } catch {
    return null;
  }

  if (!isPlatformHost(hostname)) {
    return stripWww(hostname);
  }

  if (program.domains) {
    const webDomain = program.domains.find(isCompanyDomain);
    if (webDomain) {
      return stripWww(getRegistrableDomain(webDomain));
    }
  }

  return null;
}
