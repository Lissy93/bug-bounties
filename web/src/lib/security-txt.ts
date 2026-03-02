import pLimit from 'p-limit';
import type { BountyProgram, SecurityTxtData } from '../types/Company';
import { resolvePrimaryDomain } from './domain';
import { log } from './log';

const TIMEOUT_MS = 5000;
const CONCURRENCY = 50;
const MAX_BODY_BYTES = 100_000; // security.txt should be small

const cache = new Map<string, SecurityTxtData | null>();
let cachedResults: Map<string, SecurityTxtData> | null = null;

async function fetchWithTimeout(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'bug-bounties-directory/1.0 (security.txt checker)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('html')) return null;
    const length = parseInt(res.headers.get('content-length') || '0', 10);
    if (length > MAX_BODY_BYTES) return null;
    const text = await res.text();
    if (text.length > MAX_BODY_BYTES) return null;
    if (!text.includes('Contact:') && !text.includes('contact:')) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseSecurityTxt(text: string, rawUrl: string): SecurityTxtData {
  const data: SecurityTxtData = { raw_url: rawUrl };
  const contacts: string[] = [];
  const encryptions: string[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (!value) continue;

    switch (key) {
      case 'contact':
        contacts.push(value);
        break;
      case 'encryption':
        encryptions.push(value);
        break;
      case 'acknowledgments':
      case 'acknowledgements':
        data.acknowledgments = value;
        break;
      case 'preferred-languages':
        data.preferredLanguages = value;
        break;
      case 'hiring':
        data.hiring = value;
        break;
      case 'expires':
        data.expires = value;
        break;
      case 'policy':
        data.policy = value;
        break;
      case 'canonical':
        data.canonical = value;
        break;
    }
  }

  if (contacts.length) data.contact = contacts;
  if (encryptions.length) data.encryption = encryptions;

  if (data.expires) {
    const expiryDate = new Date(data.expires);
    if (!isNaN(expiryDate.getTime())) {
      data.is_expired = expiryDate < new Date();
    }
  }

  return data;
}

async function fetchSecurityTxt(domain: string): Promise<SecurityTxtData | null> {
  if (cache.has(domain)) return cache.get(domain) ?? null;

  const wellKnownUrl = `https://${domain}/.well-known/security.txt`;
  let text = await fetchWithTimeout(wellKnownUrl);
  let usedUrl = wellKnownUrl;

  if (!text) {
    const rootUrl = `https://${domain}/security.txt`;
    text = await fetchWithTimeout(rootUrl);
    usedUrl = rootUrl;
  }

  if (!text) {
    cache.set(domain, null);
    return null;
  }

  const parsed = parseSecurityTxt(text, usedUrl);
  const hasMeaningfulData = parsed.contact?.length || parsed.policy || parsed.acknowledgments;
  if (!hasMeaningfulData) {
    cache.set(domain, null);
    return null;
  }

  cache.set(domain, parsed);
  return parsed;
}

/**
 * Pre-fetch security.txt for all programs. Call once at build time.
 * Returns a Map keyed by program slug. Never throws.
 */
export async function fetchAllSecurityTxt(
  programs: BountyProgram[],
): Promise<Map<string, SecurityTxtData>> {
  if (cachedResults) return cachedResults;

  const results = new Map<string, SecurityTxtData>();

  try {
    const limit = pLimit(CONCURRENCY);

    const domainToSlugs = new Map<string, string[]>();
    for (const p of programs) {
      const domain = resolvePrimaryDomain(p);
      if (!domain) continue;
      const slugs = domainToSlugs.get(domain) || [];
      slugs.push(p.slug);
      domainToSlugs.set(domain, slugs);
    }

    log.info('security-txt', `Fetching security.txt for ${domainToSlugs.size} unique domains...`);
    const entries = [...domainToSlugs.entries()];
    await Promise.allSettled(
      entries.map(([domain, slugs]) =>
        limit(async () => {
          const data = await fetchSecurityTxt(domain);
          if (data) {
            for (const slug of slugs) {
              results.set(slug, data);
            }
          }
        }),
      ),
    );
    log.info('security-txt', `Found security.txt for ${results.size} programs`);
  } catch (err) {
    log.warn('security-txt', 'Failed to fetch', err);
  }

  cachedResults = results;
  return results;
}
