import type { AppLookupSource, ContactInfo } from "../../types";
import { safeFetch, buildResult } from "../../util";

interface ITunesResult {
  sellerUrl?: string;
  supportUrl?: string;
  artistName?: string;
  artistViewUrl?: string;
  trackViewUrl?: string;
  primaryGenreName?: string;
}

export const appStore: AppLookupSource = {
  name: "app-store",
  tier: 1,
  async execute(ctx, signal) {
    if (ctx.store !== "appstore") return null;

    const isNumeric = /^\d+$/.test(ctx.packageId);
    const lookupUrl = isNumeric
      ? `https://itunes.apple.com/lookup?id=${ctx.packageId}&country=US`
      : `https://itunes.apple.com/lookup?bundleId=${ctx.packageId}&country=US`;

    const res = await safeFetch(lookupUrl, signal);
    if (!res) return null;

    const data = (await res.json()) as {
      resultCount: number;
      results: ITunesResult[];
    };
    if (!data.resultCount || !data.results?.[0]) return null;

    const app = data.results[0];
    const contacts: ContactInfo[] = [];
    const metadata: Record<string, unknown> = {};

    if (app.artistName) metadata.developer = app.artistName;
    if (app.primaryGenreName) metadata.genre = app.primaryGenreName;

    if (app.sellerUrl) {
      contacts.push({
        type: "url",
        value: app.sellerUrl,
        label: "App Store seller website",
      });
      metadata.developerWebsite = app.sellerUrl;
    }

    if (app.supportUrl) {
      contacts.push({
        type: "url",
        value: app.supportUrl,
        label: "App Store support URL",
      });
    }

    if (app.artistViewUrl) metadata.artistUrl = app.artistViewUrl;

    return buildResult(
      "app-store",
      1,
      contacts,
      app.trackViewUrl || ctx.storeUrl,
      metadata,
    );
  },
};
