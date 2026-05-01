import type { AppStore, ResolvedApp } from "./types";

const PLAY_URL_RE =
  /play\.google\.com\/store\/apps\/details\?.*id=([a-zA-Z0-9._]+)/;
const APPSTORE_URL_RE = /apps\.apple\.com\/.+\/app\/.+\/id(\d+)/;
const REVERSE_DOMAIN_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/i;
const VALID_PKG = /^[a-zA-Z0-9._]+$/;

export function resolveAppFromUrl(input: string): ResolvedApp | null {
  const trimmed = input.trim();

  const play = trimmed.match(PLAY_URL_RE);
  if (play) return buildResolved("play", play[1]);

  const apple = trimmed.match(APPSTORE_URL_RE);
  if (apple) return buildResolved("appstore", apple[1]);

  return null;
}

export function isAppId(input: string): boolean {
  return REVERSE_DOMAIN_RE.test(input.trim());
}

export function resolveApp(
  packageId: string,
  store: AppStore = "play",
): ResolvedApp {
  const trimmed = packageId.trim();
  if (!trimmed) throw new Error("Missing app package ID");

  if (!VALID_PKG.test(trimmed) && !/^\d+$/.test(trimmed)) {
    throw new Error(
      "Invalid package ID. Expected a reverse-domain ID (e.g. com.example.app) or numeric App Store ID.",
    );
  }

  return buildResolved(store, trimmed);
}

function buildResolved(store: AppStore, packageId: string): ResolvedApp {
  const storeUrl =
    store === "play"
      ? `https://play.google.com/store/apps/details?id=${packageId}`
      : `https://apps.apple.com/app/id${packageId}`;

  return {
    store,
    packageId,
    slug: `${store}/${packageId}`,
    storeUrl,
  };
}
