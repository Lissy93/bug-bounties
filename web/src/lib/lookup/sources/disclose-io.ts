import type {
  LookupSource,
  LookupResult,
  ResolvedDomain,
  ContactInfo,
} from "../types";
import { HOSTING_DOMAINS, DOMAIN_ALIASES, normalizeName } from "../util";

const DISCLOSE_URL =
  "https://raw.githubusercontent.com/disclose/diodb/master/program-list.json";

interface DiscloseProgram {
  program_name?: string;
  policy_url?: string;
  contact_url?: string;
  contact_email?: string;
  safe_harbor?: string;
  pgp_key?: string;
  offers_bounty?: string;
  policy_url_status?: string;
}

let cached: DiscloseProgram[] | null = null;
let cacheTime = 0;
const TTL = 3600_000;

async function loadPrograms(signal: AbortSignal): Promise<DiscloseProgram[]> {
  if (cached && Date.now() - cacheTime < TTL) return cached;
  const res = await fetch(DISCLOSE_URL, { signal });
  if (!res.ok) return [];
  const raw = await res.json();
  const list: DiscloseProgram[] = Array.isArray(raw)
    ? raw
    : (raw as { program_list?: DiscloseProgram[] }).program_list || [];
  cached = list.filter((p) => p.policy_url_status !== "dead");
  cacheTime = Date.now();
  return cached;
}

function urlMatchesDomain(url: string | undefined, domain: string): boolean {
  if (!url) return false;
  if (HOSTING_DOMAINS.has(domain)) return false;
  try {
    const host = new URL(url).hostname;
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

export const discloseIo: LookupSource = {
  name: "disclose-io",
  tier: 1,
  async execute(
    ctx: ResolvedDomain,
    signal: AbortSignal,
  ): Promise<LookupResult | null> {
    const programs = await loadPrograms(signal);
    const hint = normalizeName(ctx.companyHint);
    const aliases = [hint, ...(DOMAIN_ALIASES[hint] || [])];

    const matches = programs.filter(
      (p) =>
        urlMatchesDomain(p.policy_url, ctx.baseDomain) ||
        urlMatchesDomain(p.contact_url, ctx.baseDomain) ||
        (hint.length >= 3 &&
          aliases.includes(normalizeName(p.program_name || ""))),
    );

    if (!matches.length) return null;

    const contacts: ContactInfo[] = [];
    const meta: Record<string, unknown>[] = [];

    for (const m of matches) {
      if (m.contact_email) {
        const email = m.contact_email.replace(/^(mail\w*:)+/gi, "");
        contacts.push({
          type: "email",
          value: email,
          label: `${m.program_name} - Disclose.io`,
        });
      }
      if (m.contact_url)
        contacts.push({
          type: "url",
          value: m.contact_url,
          label: `${m.program_name} - Disclose.io contact`,
        });
      if (m.policy_url)
        contacts.push({
          type: "url",
          value: m.policy_url,
          label: `${m.program_name} - VDP policy`,
        });
      if (m.pgp_key)
        contacts.push({ type: "pgp_key", value: m.pgp_key, label: "PGP key" });
      meta.push({
        program_name: m.program_name,
        policy_url: m.policy_url,
        contact_url: m.contact_url,
        safe_harbor: m.safe_harbor,
        offers_bounty: m.offers_bounty,
      });
    }

    return {
      source: "disclose-io",
      tier: 1,
      contacts,
      metadata: { programs: meta },
    };
  },
};
