import type { ForgeLookupSource, ContactInfo } from "../../types";
import { safeFetch, emails, SECURITY_RE, buildResult } from "../../util";

interface TreeFile {
  name: string;
  path: string;
  download_url?: string;
}

function fileUrl(
  ctx: Parameters<typeof forgeIssueTemplates.execute>[0],
  f: TreeFile,
): string {
  if (ctx.host === "gitlab") {
    const proj = encodeURIComponent(ctx.projectPath);
    return `${ctx.apiBase}/projects/${proj}/repository/files/${encodeURIComponent(f.path)}/raw?ref=HEAD`;
  }
  return f.download_url || "";
}

export const forgeIssueTemplates: ForgeLookupSource = {
  name: "forge-issue-templates",
  tier: 2,
  async execute(ctx, signal) {
    const treeUrl =
      ctx.host === "gitlab"
        ? `${ctx.apiBase}/projects/${encodeURIComponent(ctx.projectPath)}/repository/tree?path=.gitlab/issue_templates&per_page=20`
        : `${ctx.apiBase}/repos/${ctx.owner}/${ctx.repo}/contents/.gitea/issue_template`;

    const treeRes = await safeFetch(treeUrl, signal);
    if (!treeRes) return null;

    const files = (await treeRes.json()) as TreeFile[];
    if (!Array.isArray(files)) return null;

    const secFiles = files.filter((f) => SECURITY_RE.test(f.name)).slice(0, 3);
    if (!secFiles.length) return null;

    /* Fetch security templates in parallel */
    const fetches = await Promise.all(
      secFiles.map(async (f) => {
        const url = fileUrl(ctx, f);
        if (!url) return null;
        const res = await safeFetch(url, signal);
        if (!res) return null;
        return { name: f.name, text: await res.text() };
      }),
    );

    const contacts: ContactInfo[] = [];
    const found: string[] = [];

    for (const f of fetches) {
      if (!f) continue;
      contacts.push(...emails(f.text, `Issue template: ${f.name}`));
      found.push(f.name);
    }

    return buildResult(
      "forge-issue-templates",
      2,
      contacts,
      ctx.fullUrl,
      found.length ? { templates: found } : undefined,
    );
  },
};
