const SLUG = /^[a-z0-9-]+$/;
const PRIVATE_HOST =
  /^(localhost|.*\.local|127\.|10\.|192\.168\.|169\.254\.|::1$|0\.0\.0\.0$)/i;

export function validSlug(s: string): boolean {
  return SLUG.test(s) && s.length > 0 && s.length <= 100;
}

export function assertHttpUrl(input: string): URL {
  let u: URL;
  try {
    u = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("URL must use http or https");
  }
  if (PRIVATE_HOST.test(u.hostname)) {
    throw new Error("Private or loopback hostnames are not allowed");
  }
  return u;
}
