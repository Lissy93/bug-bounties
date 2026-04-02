import dns from "node:dns/promises";
import type {
  ContactInfo,
  LookupResult,
  LookupSource,
  ResolvedDomain,
} from "../types";
import { EMAIL_RE, URL_RE } from "../util";

const DMARC_SERVICES =
  /dmarcian|agari|ondmarc|valimail|vali\.email|proofpoint|250ok|postmarkapp|socketlabs/i;
const INFRA_SOA =
  /cloudflare|amazon|google|azure|hetzner|digitalocean|linode|ovh|gandi|nsone|dnsimple|dynect|ultradns|neustar/i;

const e = (value: string, label: string): ContactInfo => ({
  type: "email",
  value,
  label,
});
const u = (value: string, label: string): ContactInfo => ({
  type: "url",
  value,
  label,
});
const result = (
  source: string,
  tier: 1 | 2,
  contacts: ContactInfo[],
  metadata?: Record<string, unknown>,
): LookupResult | null =>
  contacts.length ? { source, tier, contacts, metadata } : null;

export const dnsSecurity: LookupSource = {
  name: "dns-security",
  tier: 1,
  async execute(ctx: ResolvedDomain) {
    const contacts: ContactInfo[] = [];
    for (const name of [`_security._txt.${ctx.baseDomain}`, ctx.baseDomain]) {
      try {
        for (const parts of await dns.resolveTxt(name)) {
          const txt = parts.join("");
          if (!name.startsWith("_security") && !/security.contact/i.test(txt))
            continue;
          for (const v of txt.match(EMAIL_RE) || [])
            contacts.push(e(v, "DNS security TXT record"));
          for (const v of txt.match(URL_RE) || [])
            contacts.push(u(v, "DNS security TXT record"));
        }
      } catch {
        /* NXDOMAIN */
      }
    }
    return result("dns-security", 1, contacts);
  },
};

export const dmarc: LookupSource = {
  name: "dmarc",
  tier: 2,
  async execute(ctx: ResolvedDomain) {
    try {
      const contacts: ContactInfo[] = [];
      for (const parts of await dns.resolveTxt(`_dmarc.${ctx.baseDomain}`)) {
        const txt = parts.join("");
        if (!txt.toLowerCase().startsWith("v=dmarc")) continue;
        for (const m of txt.matchAll(/mailto:([^\s,;!]+)/gi)) {
          if (DMARC_SERVICES.test(m[1])) continue;
          const label = txt.includes(`ruf=mailto:${m[1]}`)
            ? "DMARC forensic report recipient"
            : "DMARC aggregate report recipient";
          contacts.push(e(m[1], label));
        }
      }
      return result("dmarc", 2, contacts);
    } catch {
      return null;
    }
  },
};

export const rfc2142: LookupSource = {
  name: "rfc2142",
  tier: 2,
  async execute(ctx: ResolvedDomain) {
    try {
      if (!(await dns.resolveMx(ctx.baseDomain)).length) return null;
    } catch {
      return null;
    }
    const d = ctx.baseDomain;
    return result(
      "rfc2142",
      2,
      [
        e(`security@${d}`, "RFC 2142 standard address (may not be monitored)"),
        e(`abuse@${d}`, "RFC 2142 standard address (may not be monitored)"),
      ],
      {
        note: "These are RFC 2142 standard mailboxes. Their existence is not verified.",
      },
    );
  },
};

export const dnsSoa: LookupSource = {
  name: "dns-soa",
  tier: 2,
  async execute(ctx: ResolvedDomain) {
    try {
      const soa = await dns.resolveSoa(ctx.baseDomain);
      if (!soa?.hostmaster) return null;
      let addr = soa.hostmaster.replace(/\\./g, "\x00");
      const i = addr.indexOf(".");
      if (i === -1) return null;
      addr = (addr.slice(0, i) + "@" + addr.slice(i + 1)).replace(/\x00/g, ".");
      if (
        !addr.includes("@") ||
        addr.includes("localhost") ||
        INFRA_SOA.test(addr)
      )
        return null;
      return result("dns-soa", 2, [e(addr, "DNS SOA hostmaster")]);
    } catch {
      return null;
    }
  },
};

export const dnsTxt: LookupSource = {
  name: "dns-txt",
  tier: 2,
  async execute(ctx: ResolvedDomain) {
    try {
      const contacts: ContactInfo[] = [];
      for (const parts of await dns.resolveTxt(ctx.baseDomain)) {
        const txt = parts.join("");
        if (
          /^v=spf|^v=dkim|^v=dmarc|^google-site-verification|^MS=|^atlassian-domain/i.test(
            txt,
          )
        )
          continue;
        for (const v of txt.match(EMAIL_RE) || [])
          contacts.push(e(v, "DNS TXT record"));
      }
      return result("dns-txt", 2, contacts);
    } catch {
      return null;
    }
  },
};
