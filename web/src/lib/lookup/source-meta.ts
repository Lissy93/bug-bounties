export interface SourceMeta {
  label: string;
  icon: string;
  disclaimer?: string;
}

export const SOURCE_META: Record<string, SourceMeta> = {
  "security-txt": { label: "security.txt", icon: "Shield" },
  "bounty-db": { label: "Bug Bounty DB", icon: "Database" },
  "disclose-io": { label: "Disclose.io", icon: "Globe" },
  "github-security": { label: "GitHub Security", icon: "Github" },
  "platform-check": { label: "Bug Bounty Platform", icon: "Search" },
  csaf: { label: "CSAF", icon: "File" },
  "dns-security": { label: "DNS Security", icon: "Server" },
  "http-headers": { label: "HTTP Headers", icon: "Code" },
  rdap: {
    label: "RDAP/WHOIS",
    icon: "Database",
    disclaimer:
      "These are typically registrar abuse addresses, not the site owner's direct security contact.",
  },
  dmarc: {
    label: "DMARC",
    icon: "Mail",
    disclaimer:
      "DMARC report recipients are monitored for email security, but may not accept vulnerability reports.",
  },
  rfc2142: {
    label: "Standard Mailbox",
    icon: "Inbox",
    disclaimer:
      "These are RFC 2142 standard mailboxes. Their existence is not verified - they are convention-based suggestions.",
  },
  "ssl-cert": {
    label: "TLS Certificate",
    icon: "Lock",
    disclaimer:
      "Extracted from the TLS certificate. This is organizational info and may not be a security contact.",
  },
  homepage: {
    label: "Homepage",
    icon: "Home",
    disclaimer:
      "Extracted from homepage markup (meta tags, mailto links). These are general contacts, not necessarily security-specific.",
  },
  "dns-soa": {
    label: "DNS SOA",
    icon: "Server",
    disclaimer:
      "The SOA hostmaster is a DNS infrastructure contact, not typically a security reporting channel.",
  },
  "common-pages": {
    label: "Common Pages",
    icon: "FileSearch",
    disclaimer:
      "These pages were detected at common paths. Verify they are relevant before submitting a report.",
  },
  "dns-txt": {
    label: "DNS TXT",
    icon: "Server",
    disclaimer:
      "Extracted from general DNS TXT records. These may be administrative contacts rather than security contacts.",
  },
  "robots-humans": {
    label: "robots/humans.txt",
    icon: "FileText",
    disclaimer:
      "Extracted from robots.txt or humans.txt. These are general contacts, not security-specific.",
  },
};
