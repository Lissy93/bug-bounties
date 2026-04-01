import type { LookupSource, ResolvedDomain, ContactInfo } from "../types";
import { UA } from "../util";

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

export const commonPages: LookupSource = {
  name: "common-pages",
  tier: 2,
  async execute(ctx: ResolvedDomain, signal: AbortSignal) {
    const checks = await Promise.allSettled(
      PATHS.map(async ([path, label]): Promise<ContactInfo | null> => {
        try {
          const res = await fetch(`https://${ctx.domain}${path}`, {
            method: "HEAD",
            signal,
            redirect: "follow",
            headers: { "User-Agent": UA },
          });
          if (!res.ok) return null;
          const final = new URL(res.url).pathname;
          if (final === "/" || final === "") return null;
          return { type: "url", value: `https://${ctx.domain}${path}`, label };
        } catch {
          return null;
        }
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
