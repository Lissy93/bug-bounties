import type {
  LookupSource,
  ResolvedDomain,
  ContactInfo,
} from "@lib/lookup/types";
import { UA } from "@lib/lookup/util";

const PATHS = [
  ["/security", "Security page"],
  ["/security/report", "Security report page"],
  ["/responsible-disclosure", "Responsible disclosure page"],
  ["/vulnerability-disclosure", "Vulnerability disclosure page"],
  ["/disclosure", "Disclosure page"],
  ["/bug-bounty", "Bug bounty page"],
  ["/vdp", "Vulnerability disclosure program"],
  ["/report-vulnerability", "Vulnerability report page"],
  ["/contact", "Contact page"],
  ["/contact-us", "Contact page"],
  ["/about/security", "Security (about) page"],
  ["/.well-known/change-password", "Change password (security-aware)"],
] as const;

async function headOk(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal,
      redirect: "follow",
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return false;
    const final = new URL(res.url).pathname;
    return final !== "/" && final !== "";
  } catch {
    return false;
  }
}

export const commonPages: LookupSource = {
  name: "common-pages",
  tier: 2,
  async execute(ctx: ResolvedDomain, signal: AbortSignal) {
    // Canary: if a random path returns 200, the site is a SPA catch-all
    const canary = await headOk(
      `https://${ctx.domain}/_bb_canary_${Date.now()}`,
      signal,
    );
    if (canary) return null;

    const checks = await Promise.allSettled(
      PATHS.map(async ([path, label]): Promise<ContactInfo | null> => {
        const ok = await headOk(`https://${ctx.domain}${path}`, signal);
        return ok
          ? { type: "url", value: `https://${ctx.domain}${path}`, label }
          : null;
      }),
    );
    const contacts = checks
      .filter(
        (r): r is PromiseFulfilledResult<ContactInfo> =>
          r.status === "fulfilled" && !!r.value,
      )
      .map((r) => r.value);
    return contacts.length
      ? { source: "common-pages", tier: 2, contacts }
      : null;
  },
};
