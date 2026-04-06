import { getRegistrableDomain, stripWww } from "@lib/domain";
import type { ResolvedDomain } from "./types";

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^fd/i,
];

export function resolveDomain(input: string): ResolvedDomain {
  let raw = input.trim();
  if (!raw) throw new Error("Empty input");

  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http/https URLs are allowed");
  }

  const hostname = url.hostname;
  if (!hostname.includes(".")) throw new Error("Invalid hostname");
  if (PRIVATE_RANGES.some((r) => r.test(hostname))) {
    throw new Error("Private/reserved addresses are not allowed");
  }

  const clean = stripWww(hostname);
  const baseDomain = getRegistrableDomain(clean);
  const companyHint = baseDomain.split(".")[0].toLowerCase();

  return { domain: clean, baseDomain, companyHint };
}
