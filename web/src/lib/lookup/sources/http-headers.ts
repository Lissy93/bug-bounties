import type { LookupSource, ResolvedDomain, ContactInfo } from "../types";
import { EMAIL_RE, URL_RE, UA } from "../util";

const HEADER_KEYS = [
  "x-bug-bounty",
  "x-bug-bounty-url",
  "x-security-contact",
  "sec-contact",
];

export const httpHeaders: LookupSource = {
  name: "http-headers",
  tier: 1,
  async execute(ctx: ResolvedDomain, signal: AbortSignal) {
    try {
      const res = await fetch(`https://${ctx.domain}/`, {
        method: "HEAD",
        signal,
        redirect: "follow",
        headers: { "User-Agent": UA },
      });
      const contacts: ContactInfo[] = [];

      for (const key of HEADER_KEYS) {
        const val = res.headers.get(key);
        if (!val) continue;
        const em = val.match(EMAIL_RE),
          ur = val.match(URL_RE);
        for (const e of em || [])
          contacts.push({
            type: "email",
            value: e,
            label: `HTTP ${key} header`,
          });
        for (const u of ur || [])
          contacts.push({ type: "url", value: u, label: `HTTP ${key} header` });
        if (!em && !ur)
          contacts.push({
            type: "url",
            value: val,
            label: `HTTP ${key} header`,
          });
      }

      const link = res.headers.get("link") || "";
      const linkUrl =
        /rel=["']?security/i.test(link) && link.match(/<([^>]+)>/);
      if (linkUrl)
        contacts.push({
          type: "url",
          value: linkUrl[1],
          label: "HTTP Link header (security)",
        });

      return contacts.length
        ? { source: "http-headers", tier: 1, contacts }
        : null;
    } catch {
      return null;
    }
  },
};
