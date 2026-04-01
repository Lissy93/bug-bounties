import type { ContactInfo } from "./types";

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
