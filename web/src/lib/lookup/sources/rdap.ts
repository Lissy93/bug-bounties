import type {
  LookupSource,
  ResolvedDomain,
  ContactInfo,
} from "@lib/lookup/types";

let bootstrapCache: Record<string, string> | null = null;
let bootstrapTime = 0;

async function getBootstrap(): Promise<Record<string, string>> {
  if (bootstrapCache && Date.now() - bootstrapTime < 86400_000)
    return bootstrapCache;
  const res = await fetch("https://data.iana.org/rdap/dns.json", {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return {};
  const data = await res.json();
  const map: Record<string, string> = {};
  for (const [tlds, urls] of data.services || [])
    for (const tld of tlds) map[tld] = (urls[0] || "").replace(/\/$/, "");
  bootstrapCache = map;
  bootstrapTime = Date.now();
  return map;
}

function roleLabel(roles: string[]): string | null {
  if (roles.includes("abuse")) return "RDAP abuse contact";
  if (roles.includes("registrant")) return "RDAP registrant";
  if (roles.includes("technical")) return "RDAP technical contact";
  if (roles.includes("registrar")) return "RDAP registrar";
  return null;
}

function extractEmails(entity: Record<string, unknown>): string[] {
  const vcard = entity.vcardArray as [string, unknown[][]] | undefined;
  if (!Array.isArray(vcard?.[1])) return [];
  return vcard[1]
    .filter(
      (p) => Array.isArray(p) && p[0] === "email" && typeof p[3] === "string",
    )
    .map((p) => (p as string[])[3]);
}

function collectContacts(
  entities: Record<string, unknown>[],
  contacts: ContactInfo[],
) {
  for (const entity of entities) {
    const roles = (entity.roles || []) as string[];
    const label = roleLabel(roles);
    if (!label) continue;
    for (const email of extractEmails(entity)) {
      if (!email || /redacted|private|not\s*disclosed/i.test(email)) continue;
      contacts.push({ type: "email", value: email, label });
    }
    const subs = (entity.entities || []) as Record<string, unknown>[];
    if (subs.length) collectContacts(subs, contacts);
  }
}

export const rdap: LookupSource = {
  name: "rdap",
  tier: 2,
  async execute(ctx: ResolvedDomain, signal: AbortSignal) {
    const bootstrap = await getBootstrap();
    const tld = ctx.baseDomain.split(".").slice(1).join(".");
    const server = bootstrap[tld] || bootstrap[tld.split(".").pop() || ""];
    if (!server) return null;

    try {
      const res = await fetch(`${server}/domain/${ctx.baseDomain}`, {
        signal,
        headers: { Accept: "application/rdap+json" },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const contacts: ContactInfo[] = [];
      collectContacts(
        (data.entities || []) as Record<string, unknown>[],
        contacts,
      );
      return contacts.length ? { source: "rdap", tier: 2, contacts } : null;
    } catch {
      return null;
    }
  },
};
