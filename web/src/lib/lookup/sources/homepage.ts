import type {
  LookupSource,
  ResolvedDomain,
  ContactInfo,
} from "@lib/lookup/types";
import { EMAIL_RE, UA } from "@lib/lookup/util";

const JSON_LD_RE =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const META_RE =
  /<meta[^>]+(?:name|property)=["'](author|contact|twitter:site)["'][^>]+content=["']([^"']+)["']/gi;
const MAILTO_RE = /href=["']mailto:([^"'?]+)/gi;

function extractJsonLd(html: string): ContactInfo[] {
  const out: ContactInfo[] = [];
  let m;
  while ((m = JSON_LD_RE.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      const items: Record<string, unknown>[] = Array.isArray(parsed)
        ? parsed
        : [parsed];
      for (const item of items) {
        const cps = Array.isArray(item.contactPoint)
          ? item.contactPoint
          : item.contactPoint
            ? [item.contactPoint]
            : [];
        for (const cp of cps as Record<string, string>[]) {
          const t = cp.contactType || "general";
          if (cp.email)
            out.push({
              type: "email",
              value: cp.email.replace(/^mailto:/, ""),
              label: `ContactPoint (${t})`,
            });
          if (cp.telephone)
            out.push({
              type: "phone",
              value: cp.telephone,
              label: `ContactPoint (${t})`,
            });
          if (cp.url)
            out.push({
              type: "url",
              value: cp.url,
              label: `ContactPoint (${t})`,
            });
        }
        if (
          item["@type"] === "Organization" ||
          item["@type"] === "Corporation"
        ) {
          if (item.email)
            out.push({
              type: "email",
              value: String(item.email).replace(/^mailto:/, ""),
              label: "Organization (JSON-LD)",
            });
          if (item.telephone)
            out.push({
              type: "phone",
              value: String(item.telephone),
              label: "Organization (JSON-LD)",
            });
        }
      }
    } catch {
      /* invalid JSON */
    }
  }
  return out;
}

export const homepage: LookupSource = {
  name: "homepage",
  tier: 2,
  async execute(ctx: ResolvedDomain, signal: AbortSignal) {
    try {
      const res = await fetch(`https://${ctx.domain}/`, {
        signal,
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      if (!res.ok) return null;
      const cl = parseInt(res.headers.get("content-length") || "0", 10);
      if (cl > 1_000_000) return null;
      const html = (await res.text()).slice(0, 500_000);

      const contacts: ContactInfo[] = [...extractJsonLd(html)];

      let m;
      while ((m = META_RE.exec(html)) !== null) {
        if (m[1] === "twitter:site" && m[2].startsWith("@"))
          contacts.push({
            type: "url",
            value: `https://x.com/${m[2].slice(1)}`,
            label: "Twitter/X profile",
          });
        else if (m[2].match(EMAIL_RE))
          contacts.push({
            type: "email",
            value: m[2],
            label: `HTML meta ${m[1]}`,
          });
      }

      const seen = new Set<string>();
      while ((m = MAILTO_RE.exec(html)) !== null) {
        if (!seen.has(m[1]) && !m[1].includes("example.")) {
          seen.add(m[1]);
          contacts.push({
            type: "email",
            value: m[1],
            label: "mailto link on homepage",
          });
        }
      }

      return contacts.length ? { source: "homepage", tier: 2, contacts } : null;
    } catch {
      return null;
    }
  },
};
