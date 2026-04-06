import type { LookupSource, ResolvedDomain } from "@lib/lookup/types";
import { emails, UA } from "@lib/lookup/util";

async function fetchPlain(
  url: string,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal, headers: { "User-Agent": UA } });
    if (!res.ok || (res.headers.get("content-type") || "").includes("html"))
      return null;
    const text = await res.text();
    return text.length > 50_000 ? null : text;
  } catch {
    return null;
  }
}

export const robotsHumans: LookupSource = {
  name: "robots-humans",
  tier: 2,
  async execute(ctx: ResolvedDomain, signal: AbortSignal) {
    const [robots, humans] = await Promise.all([
      fetchPlain(`https://${ctx.domain}/robots.txt`, signal),
      fetchPlain(`https://${ctx.domain}/humans.txt`, signal),
    ]);
    const contacts = [
      ...emails(humans || "", "humans.txt"),
      ...(robots || "")
        .split("\n")
        .filter((l) => l.startsWith("#"))
        .flatMap((l) => emails(l, "robots.txt comment")),
    ];
    return contacts.length
      ? { source: "robots-humans", tier: 2, contacts }
      : null;
  },
};
