import type {
  LookupSource,
  ResolvedDomain,
  ContactInfo,
} from "@lib/lookup/types";
import { UA } from "@lib/lookup/util";

async function checkHackerOne(
  hint: string,
  signal: AbortSignal,
): Promise<ContactInfo | null> {
  const url = `https://hackerone.com/${hint}`;
  try {
    const res = await fetch(url, {
      signal,
      redirect: "follow",
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 20_000);
    // HackerOne returns 200 for user profiles too - reject those
    if (/og:type"\s*content="profile"/i.test(html)) return null;
    if (/page\s*not\s*found/i.test(html)) return null;
    return { type: "url", value: url, label: "HackerOne program" };
  } catch {
    return null;
  }
}

async function checkBugcrowd(
  hint: string,
  signal: AbortSignal,
): Promise<ContactInfo | null> {
  const url = `https://bugcrowd.com/${hint}`;
  try {
    // Don't follow redirects - we need to inspect where it goes
    const res = await fetch(url, {
      signal,
      redirect: "manual",
      headers: { "User-Agent": UA },
    });
    if (res.status === 404) return null;
    const location = res.headers.get("location") || "";
    // 302 to /engagements/ = public program
    if (location.includes("/engagements/")) {
      return { type: "url", value: location, label: "Bugcrowd program" };
    }
    // 301 to /h/ = private/invite-only, not useful
    return null;
  } catch {
    return null;
  }
}

export const platformCheck: LookupSource = {
  name: "platform-check",
  tier: 1,
  async execute(ctx: ResolvedDomain, signal: AbortSignal) {
    const [h1, bc] = await Promise.all([
      checkHackerOne(ctx.companyHint, signal),
      checkBugcrowd(ctx.companyHint, signal),
    ]);
    const contacts = [h1, bc].filter((c): c is ContactInfo => c !== null);
    return contacts.length
      ? { source: "platform-check", tier: 1, contacts }
      : null;
  },
};
