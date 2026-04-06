import type { ForgeLookupSource, ContactInfo } from "../../types";
import { safeFetch, SKIP_EMAIL_RE } from "../../util";

interface ForgeUser {
  login?: string;
  username?: string;
  name?: string;
  email?: string;
  bio?: string;
  website?: string;
  avatar_url?: string;
  html_url?: string;
  web_url?: string;
  location?: string;
}

async function fetchUser(
  ctx: Parameters<typeof forgeOwner.execute>[0],
  signal: AbortSignal,
): Promise<ForgeUser | null> {
  if (ctx.host === "gitlab") {
    const proj = encodeURIComponent(ctx.projectPath);
    const projRes = await safeFetch(`${ctx.apiBase}/projects/${proj}`, signal);
    if (!projRes) return null;

    const data = (await projRes.json()) as {
      namespace?: { kind?: string };
    };
    if (!data.namespace?.kind) return null;

    const nsUrl =
      data.namespace.kind === "user"
        ? `${ctx.apiBase}/users?username=${ctx.owner.split("/")[0]}`
        : `${ctx.apiBase}/groups/${encodeURIComponent(ctx.owner)}`;

    const nsRes = await safeFetch(nsUrl, signal);
    if (!nsRes) return null;

    const nsData = await nsRes.json();
    return Array.isArray(nsData) ? nsData[0] : nsData;
  }

  /* Codeberg / Gitea */
  const res = await safeFetch(`${ctx.apiBase}/users/${ctx.owner}`, signal);
  return res ? ((await res.json()) as ForgeUser) : null;
}

export const forgeOwner: ForgeLookupSource = {
  name: "forge-owner",
  tier: 1,
  async execute(ctx, signal) {
    const user = await fetchUser(ctx, signal);
    if (!user) return null;

    const contacts: ContactInfo[] = [];

    if (user.email && !SKIP_EMAIL_RE.test(user.email)) {
      contacts.push({
        type: "email",
        value: user.email,
        label: "Repository owner email",
      });
    }

    if (user.website) {
      try {
        const url = user.website.startsWith("http")
          ? user.website
          : `https://${user.website}`;
        if (new URL(url).protocol.startsWith("http")) {
          contacts.push({ type: "url", value: url, label: "Owner website" });
        }
      } catch {
        /* invalid URL */
      }
    }

    const login = user.login || user.username || ctx.owner;
    const profileUrl =
      user.html_url ||
      user.web_url ||
      `${ctx.fullUrl.split("/").slice(0, 3).join("/")}/${login}`;

    const metadata: Record<string, unknown> = { login, profileUrl };
    if (user.name) metadata.name = user.name;
    if (user.bio) metadata.bio = user.bio;
    if (user.location) metadata.location = user.location;
    if (user.avatar_url) metadata.avatarUrl = user.avatar_url;

    if (!contacts.length && !metadata.name && !metadata.bio) return null;

    return {
      source: "forge-owner",
      tier: 1,
      contacts,
      url: profileUrl,
      metadata,
    };
  },
};
