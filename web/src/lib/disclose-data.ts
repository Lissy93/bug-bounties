import type { BountyProgram, DiscloseData } from "../types/Company";
import { log } from "./log";

const DISCLOSE_URL =
  "https://raw.githubusercontent.com/disclose/diodb/master/program-list.json";

interface RawDiscloseProgram {
  program_name?: string;
  policy_url?: string;
  policy_url_status?: string;
  contact_url?: string;
  contact_email?: string;
  safe_harbor?: string;
  pgp_key?: string;
  securitytxt_url?: string;
  preferred_languages?: string;
  hiring?: string;
  launch_date?: string;
  offers_bounty?: string;
  offers_swag?: string;
  hall_of_fame?: string;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let cached: Map<string, DiscloseData> | null = null;

/**
 * Fetch Disclose.io program list and build a lookup map keyed by program slug.
 * Call once at build time. Never throws.
 */
export async function fetchDiscloseData(
  programs: BountyProgram[],
): Promise<Map<string, DiscloseData>> {
  if (cached) return cached;

  try {
    log.info("disclose-data", "Fetching Disclose.io program list...");
    const res = await fetch(DISCLOSE_URL);
    if (!res.ok) {
      log.warn("disclose-data", `HTTP ${res.status}`);
      cached = new Map();
      return cached;
    }

    const raw = (await res.json()) as
      | RawDiscloseProgram[]
      | { program_list?: RawDiscloseProgram[] };
    const list: RawDiscloseProgram[] = Array.isArray(raw)
      ? raw
      : (raw as { program_list?: RawDiscloseProgram[] }).program_list || [];

    // Build a map of normalized name -> Disclose program
    const byName = new Map<string, RawDiscloseProgram>();
    for (const p of list) {
      if (p.policy_url_status === "dead") continue;
      const name = normalizeName(p.program_name || "");
      if (name) byName.set(name, p);
    }

    const results = new Map<string, DiscloseData>();

    for (const program of programs) {
      const key = normalizeName(program.company);
      const match = byName.get(key);
      if (!match) continue;

      const data: DiscloseData = {};
      if (match.safe_harbor) data.safeHarbor = match.safe_harbor;
      if (match.pgp_key) data.pgpKey = match.pgp_key;
      if (match.securitytxt_url) data.securitytxtUrl = match.securitytxt_url;
      if (match.preferred_languages)
        data.preferredLanguages = match.preferred_languages;
      if (match.launch_date) data.launchDate = match.launch_date;
      if (
        match.hiring &&
        match.hiring.toLowerCase() !== "no" &&
        match.hiring.toLowerCase() !== "false"
      ) {
        data.hiring = true;
      }

      if (Object.keys(data).length > 0) {
        results.set(program.slug, data);
      }
    }

    log.info(
      "disclose-data",
      `Matched Disclose data for ${results.size} programs`,
    );
    cached = results;
    return results;
  } catch (err) {
    log.warn("disclose-data", "Failed to load", err);
    cached = new Map();
    return cached;
  }
}
