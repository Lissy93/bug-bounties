import type { PackageLookupSource, ContactInfo } from "../../types";
import { safeFetch, buildResult } from "../../util";

interface CrateData {
  crate: {
    repository?: string;
    homepage?: string;
    description?: string;
  };
}

interface CrateOwner {
  login: string;
  url: string;
  kind: string;
  name?: string;
}

export const cratesRegistry: PackageLookupSource = {
  name: "crates-registry",
  tier: 1,
  async execute(ctx, signal) {
    if (ctx.registry !== "crates") return null;

    const [crateRes, ownersRes] = await Promise.all([
      safeFetch(`https://crates.io/api/v1/crates/${ctx.name}`, signal),
      safeFetch(`https://crates.io/api/v1/crates/${ctx.name}/owners`, signal),
    ]);
    if (!crateRes) return null;

    const data = (await crateRes.json()) as CrateData;
    const contacts: ContactInfo[] = [];

    if (data.crate.repository) {
      contacts.push({
        type: "url",
        value: data.crate.repository,
        label: "crates.io repository",
      });
    }

    const metadata: Record<string, unknown> = {};
    if (data.crate.homepage) metadata.homepage = data.crate.homepage;
    if (data.crate.repository) metadata.repository = data.crate.repository;
    if (data.crate.description) metadata.description = data.crate.description;

    if (ownersRes) {
      const ownerData = (await ownersRes.json()) as { users: CrateOwner[] };
      if (ownerData.users?.length) {
        metadata.ownerCount = ownerData.users.length;
        for (const o of ownerData.users) {
          if (o.url) {
            contacts.push({
              type: "url",
              value: o.url,
              label: `crates.io owner (${o.name || o.login})`,
            });
          }
        }
      }
    }

    return buildResult(
      "crates-registry",
      1,
      contacts,
      ctx.registryUrl,
      metadata,
    );
  },
};
