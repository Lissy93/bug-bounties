import type { ContactInfo, LookupResult } from "./types";

export const HOSTING_DOMAINS = new Set([
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "google.com",
  "googleapis.com",
  "amazonaws.com",
  "cloudfront.net",
  "cloudflare.com",
  "microsoft.com",
  "apple.com",
  "npmjs.com",
  "sharepoint.com",
  "hackerone.com",
  "bugcrowd.com",
  "intigriti.com",
  "yeswehack.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "facebook.com",
  "medium.com",
  "notion.so",
  "docs.google.com",
]);

export const DOMAIN_ALIASES: Record<string, string[]> = {
  meta: ["facebook", "fb"],
  x: ["twitter"],
  alphabet: ["google"],
};

export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
export const URL_RE = /https?:\/\/[^\s,;>"')}]+/gi;
export const UA = "bug-bounties-lookup/1.0";

export const SECURITY_RE = /security|vulnerabilit|report|bounty|disclosure/gi;

export const SKIP_EMAIL_RE =
  /no-?reply|donotreply|example\.|localhost|test\.|noreply\.github\.com/i;

export function decodeGoogleRedirect(url: string): string {
  try {
    if (url.includes("google.com/url")) {
      return new URL(url).searchParams.get("q") || url;
    }
  } catch {
    /* use as-is */
  }
  return url;
}

export function buildResult(
  source: string,
  tier: 1 | 2,
  contacts: ContactInfo[],
  url: string,
  metadata?: Record<string, unknown>,
): LookupResult | null {
  const hasMeta = metadata && Object.keys(metadata).length > 0;
  if (!contacts.length && !hasMeta) return null;
  return {
    source,
    tier,
    contacts,
    url,
    metadata: hasMeta ? metadata : undefined,
  };
}

export function emails(text: string, label: string): ContactInfo[] {
  return [...new Set(text.match(EMAIL_RE) || [])].map((v) => ({
    type: "email" as const,
    value: v,
    label,
  }));
}

export function urls(text: string, label: string): ContactInfo[] {
  return [...new Set(text.match(URL_RE) || [])].map((v) => ({
    type: "url" as const,
    value: v,
    label,
  }));
}

export async function safeFetch(
  url: string,
  signal: AbortSignal,
  opts?: RequestInit,
): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      signal,
      headers: { "User-Agent": UA },
      ...opts,
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}
