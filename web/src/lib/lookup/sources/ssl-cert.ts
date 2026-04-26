import tls from "node:tls";
import type {
  LookupSource,
  LookupResult,
  ResolvedDomain,
  ContactInfo,
} from "@lib/lookup/types";

function getCert(domain: string): Promise<tls.PeerCertificate | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      443,
      domain,
      { servername: domain, rejectUnauthorized: false, timeout: 5000 },
      () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        resolve(cert && cert.subject ? cert : null);
      },
    );
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

export const sslCert: LookupSource = {
  name: "ssl-cert",
  tier: 2,
  async execute(ctx: ResolvedDomain): Promise<LookupResult | null> {
    const cert = await getCert(ctx.domain);
    if (!cert) return null;

    const contacts: ContactInfo[] = [];
    const meta: Record<string, unknown> = {};

    if (cert.subject?.O) meta.organization = cert.subject.O;
    const email = cert.subject?.emailAddress;
    if (typeof email === "string") {
      contacts.push({
        type: "email",
        value: email,
        label: "TLS certificate email",
      });
    }

    if (!contacts.length && !meta.organization) return null;
    return { source: "ssl-cert", tier: 2, contacts, metadata: meta };
  },
};
