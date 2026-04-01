import type { LookupSource, ResolvedDomain, ContactInfo } from "../types";
import { UA } from "../util";

const NOT_FOUND =
  /page\s+not\s+found|404|does\s+not\s+exist|not\s+found|no\s+results/i;
const VALID =
  /policy|scope|bounty|submit\s+a\s+report|vulnerability|reward|program/i;

const PLATFORMS = [
  { name: "HackerOne", url: (h: string) => `https://hackerone.com/${h}` },
  { name: "Bugcrowd", url: (h: string) => `https://bugcrowd.com/${h}` },
  {
    name: "Intigriti",
    url: (h: string) => `https://app.intigriti.com/programs/${h}`,
  },
  {
    name: "YesWeHack",
    url: (h: string) => `https://yeswehack.com/programs/${h}`,
  },
];

export const platformCheck: LookupSource = {
  name: "platform-check",
  tier: 1,
  async execute(ctx: ResolvedDomain, signal: AbortSignal) {
    const checks = await Promise.allSettled(
      PLATFORMS.map(async (p): Promise<ContactInfo | null> => {
        const url = p.url(ctx.companyHint);
        try {
          const res = await fetch(url, {
            signal,
            redirect: "follow",
            headers: { "User-Agent": UA },
          });
          if (!res.ok) return null;
          const html = (await res.text()).slice(0, 100_000);
          return VALID.test(html) && !NOT_FOUND.test(html)
            ? { type: "url", value: url, label: `${p.name} program` }
            : null;
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
      ? { source: "platform-check", tier: 1, contacts }
      : null;
  },
};
