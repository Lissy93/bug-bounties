import { fetchWithTimeout, parseSecurityTxt } from "@lib/security-txt";
import type {
  LookupSource,
  LookupResult,
  ResolvedDomain,
} from "@lib/lookup/types";

async function tryDomain(domain: string): Promise<LookupResult | null> {
  const wellKnown = `https://${domain}/.well-known/security.txt`;
  let text = await fetchWithTimeout(wellKnown);
  let usedUrl = wellKnown;
  if (!text) {
    const root = `https://${domain}/security.txt`;
    text = await fetchWithTimeout(root);
    usedUrl = root;
  }
  if (!text) return null;

  const parsed = parseSecurityTxt(text, usedUrl);
  if (!parsed.contact?.length && !parsed.policy) return null;

  return {
    source: "security-txt",
    tier: 1,
    url: usedUrl,
    contacts: [
      ...(parsed.contact || []).map((c) => {
        const value = c.replace(/^mailto:/, "");
        const isEmail =
          c.startsWith("mailto:") ||
          (value.includes("@") && !value.startsWith("http"));
        return {
          type: isEmail ? ("email" as const) : ("url" as const),
          value,
          label: "security.txt contact",
        };
      }),
      ...(parsed.encryption || []).map((e) => ({
        type: "pgp_key" as const,
        value: e,
        label: "Encryption key",
      })),
    ],
    metadata: {
      policy: parsed.policy,
      acknowledgments: parsed.acknowledgments,
      preferredLanguages: parsed.preferredLanguages,
      expires: parsed.expires,
      is_expired: parsed.is_expired,
    },
  };
}

export const securityTxt: LookupSource = {
  name: "security-txt",
  tier: 1,
  async execute(ctx: ResolvedDomain) {
    const result = await tryDomain(ctx.domain);
    if (result) return result;
    if (ctx.baseDomain !== ctx.domain) return tryDomain(ctx.baseDomain);
    return null;
  },
};
