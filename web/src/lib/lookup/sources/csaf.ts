import type { LookupSource, LookupResult, ResolvedDomain } from "../types";
import { emails, urls, safeFetch } from "../util";

async function tryFetch(
  domain: string,
  signal: AbortSignal,
): Promise<LookupResult | null> {
  const url = `https://${domain}/.well-known/csaf/provider-metadata.json`;
  const res = await safeFetch(url, signal);
  if (!res) return null;
  try {
    const data = await res.json();
    const contacts = [
      ...emails(
        data?.publisher?.contact_details || "",
        "CSAF publisher contact",
      ),
      ...urls(data?.publisher?.contact_details || "", "CSAF publisher contact"),
      ...emails(
        data?.publisher?.issuing_authority || "",
        "CSAF issuing authority",
      ),
    ];
    return contacts.length ? { source: "csaf", tier: 1, contacts, url } : null;
  } catch {
    return null;
  }
}

export const csaf: LookupSource = {
  name: "csaf",
  tier: 1,
  async execute(ctx: ResolvedDomain, signal: AbortSignal) {
    return (
      (await tryFetch(ctx.domain, signal)) ??
      (ctx.baseDomain !== ctx.domain ? tryFetch(ctx.baseDomain, signal) : null)
    );
  },
};
