import type { PackageLookupSource, ContactInfo } from "@lib/lookup/types";
import { safeFetch, emails, buildResult, SECURITY_RE } from "@lib/lookup/util";

interface PyPIInfo {
  author_email?: string;
  maintainer_email?: string;
  author?: string;
  maintainer?: string;
  home_page?: string;
  bugtrack_url?: string;
  project_urls?: Record<string, string>;
  summary?: string;
}

export const pypiRegistry: PackageLookupSource = {
  name: "pypi-registry",
  tier: 1,
  async execute(ctx, signal) {
    if (ctx.registry !== "pypi") return null;

    const res = await safeFetch(
      `https://pypi.org/pypi/${ctx.name}/json`,
      signal,
    );
    if (!res) return null;

    const data = (await res.json()) as { info: PyPIInfo };
    const info = data.info;
    const contacts: ContactInfo[] = [];

    if (info.author_email) {
      contacts.push(
        ...emails(
          info.author_email,
          info.author ? `PyPI author (${info.author})` : "PyPI author",
        ),
      );
    }
    if (info.maintainer_email) {
      contacts.push(
        ...emails(
          info.maintainer_email,
          info.maintainer
            ? `PyPI maintainer (${info.maintainer})`
            : "PyPI maintainer",
        ),
      );
    }

    if (info.bugtrack_url) {
      contacts.push({
        type: "url",
        value: info.bugtrack_url,
        label: "PyPI bug tracker",
      });
    }

    if (info.project_urls) {
      for (const [key, url] of Object.entries(info.project_urls)) {
        if (SECURITY_RE.test(key) && url) {
          contacts.push({ type: "url", value: url, label: `PyPI ${key}` });
        }
      }
    }

    const metadata: Record<string, unknown> = {};
    if (info.home_page) metadata.homepage = info.home_page;
    if (info.summary) metadata.description = info.summary;
    if (info.project_urls) {
      const source =
        info.project_urls["Source"] ||
        info.project_urls["Repository"] ||
        info.project_urls["Source Code"];
      if (source) metadata.repository = source;
    }

    return buildResult("pypi-registry", 1, contacts, ctx.registryUrl, metadata);
  },
};
