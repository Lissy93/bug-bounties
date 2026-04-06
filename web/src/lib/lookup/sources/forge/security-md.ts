import type { ForgeLookupSource, ContactInfo } from "../../types";
import { safeFetch, emails, urls, SECURITY_RE, buildResult } from "../../util";

const PATHS = ["SECURITY.md", ".github/SECURITY.md", "docs/SECURITY.md"];
const MAX_SIZE = 500_000;

function rawFileUrl(
  ctx: Parameters<typeof forgeSecurityMd.execute>[0],
  path: string,
): string {
  if (ctx.host === "gitlab") {
    const proj = encodeURIComponent(ctx.projectPath);
    return `${ctx.apiBase}/projects/${proj}/repository/files/${encodeURIComponent(path)}/raw?ref=HEAD`;
  }
  return `${ctx.fullUrl}/raw/branch/main/${path}`;
}

export const forgeSecurityMd: ForgeLookupSource = {
  name: "forge-security-md",
  tier: 1,
  async execute(ctx, signal) {
    const contacts: ContactInfo[] = [];
    let foundFile: string | null = null;

    for (const path of PATHS) {
      const res = await safeFetch(rawFileUrl(ctx, path), signal);
      if (!res) continue;

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("html")) continue;

      const text = await res.text();
      if (text.length > MAX_SIZE || !text.trim()) continue;

      foundFile = path;
      contacts.push({
        type: "url",
        value: `${ctx.fullUrl}/-/blob/HEAD/${path}`,
        label: "SECURITY.md",
      });
      contacts.push(...emails(text, "SECURITY.md"));
      contacts.push(
        ...urls(text, "SECURITY.md").filter((c) => SECURITY_RE.test(c.value)),
      );
      break;
    }

    const fileUrl = foundFile
      ? `${ctx.fullUrl}/-/blob/HEAD/${foundFile}`
      : ctx.fullUrl;
    return buildResult(
      "forge-security-md",
      1,
      contacts,
      fileUrl,
      foundFile ? { file: foundFile } : undefined,
    );
  },
};
