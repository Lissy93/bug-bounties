import type { AppLookupSource, ContactInfo } from "../../types";
import {
  safeFetch,
  EMAIL_RE,
  decodeGoogleRedirect,
  buildResult,
} from "../../util";

export const playStore: AppLookupSource = {
  name: "play-store",
  tier: 1,
  async execute(ctx, signal) {
    if (ctx.store !== "play") return null;

    const res = await safeFetch(
      `https://play.google.com/store/apps/details?id=${ctx.packageId}&hl=en&gl=US`,
      signal,
    );
    if (!res) return null;

    const html = await res.text();
    if (html.length > 2_000_000) return null;

    const contacts: ContactInfo[] = [];
    const metadata: Record<string, unknown> = {};

    /* Developer name */
    const devNameMatch = html.match(
      /<a[^>]*href="\/store\/apps\/dev[^"]*"[^>]*>([^<]+)<\/a>/,
    );
    if (devNameMatch) metadata.developer = devNameMatch[1].trim();

    /* Developer email - use frequency analysis to pick the real one.
       The developer email appears multiple times in structured data
       while "similar apps" emails appear once. */
    const emailMatches = html.match(EMAIL_RE);
    if (emailMatches) {
      const freq = new Map<string, number>();
      for (const email of emailMatches) {
        const lower = email.toLowerCase();
        if (lower.endsWith("@google.com") || lower.endsWith("@email.com"))
          continue;
        freq.set(lower, (freq.get(lower) || 0) + 1);
      }
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        contacts.push({
          type: "email",
          value: sorted[0][0],
          label: "Play Store developer email",
        });
      }
    }

    /* Developer website */
    const devWebsiteMatch = html.match(
      /Developer[^]*?Visit\s+website[^]*?href="(https?:\/\/[^"]+)"/i,
    );
    if (devWebsiteMatch) {
      const url = decodeGoogleRedirect(devWebsiteMatch[1]);
      contacts.push({ type: "url", value: url, label: "Developer website" });
      metadata.developerWebsite = url;
    }

    /* Privacy policy */
    const privacyMatch = html.match(
      /[Pp]rivacy\s+[Pp]olicy[^]*?href="(https?:\/\/[^"]+)"/,
    );
    if (privacyMatch) {
      metadata.privacyPolicy = decodeGoogleRedirect(privacyMatch[1]);
    }

    return buildResult("play-store", 1, contacts, ctx.storeUrl, metadata);
  },
};
