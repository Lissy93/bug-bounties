import type { PackageLookupSource, ContactInfo } from "@lib/lookup/types";
import { safeFetch, emails, buildResult } from "@lib/lookup/util";

interface NpmPackage {
  maintainers?: { name?: string; email?: string }[];
  bugs?: { url?: string; email?: string };
  repository?: { url?: string } | string;
  homepage?: string;
  description?: string;
}

export const npmRegistry: PackageLookupSource = {
  name: "npm-registry",
  tier: 1,
  async execute(ctx, signal) {
    if (ctx.registry !== "npm") return null;

    const res = await safeFetch(
      `https://registry.npmjs.org/${ctx.name}`,
      signal,
    );
    if (!res) return null;

    const pkg = (await res.json()) as NpmPackage;
    const contacts: ContactInfo[] = [];

    for (const m of pkg.maintainers || []) {
      if (m.email) {
        contacts.push({
          type: "email",
          value: m.email,
          label: m.name ? `npm maintainer (${m.name})` : "npm maintainer",
        });
      }
    }

    if (pkg.bugs?.email) contacts.push(...emails(pkg.bugs.email, "npm bugs"));
    if (pkg.bugs?.url) {
      contacts.push({ type: "url", value: pkg.bugs.url, label: "npm bugs" });
    }

    const repoUrl =
      typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;

    const metadata: Record<string, unknown> = {};
    if (pkg.maintainers?.length)
      metadata.maintainerCount = pkg.maintainers.length;
    if (repoUrl) metadata.repository = repoUrl.replace(/^git\+/, "");
    if (pkg.homepage) metadata.homepage = pkg.homepage;
    if (pkg.description) metadata.description = pkg.description;

    return buildResult("npm-registry", 1, contacts, ctx.registryUrl, metadata);
  },
};
