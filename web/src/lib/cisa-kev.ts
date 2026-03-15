import type {
  BountyProgram,
  KevVulnerability,
  KevData,
} from "../types/Company";
import { resolvePrimaryDomain } from "./domain";
import { log } from "./log";

const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

interface RawKevEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  shortDescription: string;
  dateAdded: string;
  knownRansomwareCampaignUse: "Known" | "Unknown";
}

interface RawKevCatalog {
  vulnerabilities: RawKevEntry[];
}

let cachedResults: Map<string, KevData> | null = null;

// Suffixes to strip when normalizing company names for matching
const COMPANY_SUFFIXES =
  /\s*(?:bug\s*bounty(?:\s*program)?|vdp|vulnerability\s*disclosure(?:\s*program)?|inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|group|technologies|technology|software|systems|networks|security)\s*$/gi;
const PARENS = /\s*\(.*?\)\s*/g;

function normalizeCompanyName(name: string): string {
  let normalized = name.toLowerCase().trim();
  normalized = normalized.replace(PARENS, " ");
  // Apply suffix stripping repeatedly since names can have stacked suffixes
  let prev = "";
  while (prev !== normalized) {
    prev = normalized;
    normalized = normalized.replace(COMPANY_SUFFIXES, "").trim();
  }
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

function domainToVendorGuess(domain: string): string {
  // "cisco.com" -> "cisco", "elastic.co" -> "elastic"
  const parts = domain.split(".");
  return parts[0];
}

/**
 * Fetch the CISA KEV catalog and match vulnerabilities to programs.
 * Returns a Map keyed by program slug. Never throws.
 */
export async function fetchCisaKev(
  programs: BountyProgram[],
): Promise<Map<string, KevData>> {
  if (cachedResults) return cachedResults;

  const results = new Map<string, KevData>();

  try {
    const res = await fetch(KEV_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      log.warn("cisa-kev", `Failed to download catalog: HTTP ${res.status}`);
      cachedResults = results;
      return results;
    }

    const catalog: RawKevCatalog = await res.json();
    log.info(
      "cisa-kev",
      `Loaded ${catalog.vulnerabilities.length} KEV entries`,
    );

    // Build vendor -> vulnerabilities lookup
    const vendorMap = new Map<string, RawKevEntry[]>();
    for (const entry of catalog.vulnerabilities) {
      const vendor = entry.vendorProject.toLowerCase();
      const existing = vendorMap.get(vendor);
      if (existing) {
        existing.push(entry);
      } else {
        vendorMap.set(vendor, [entry]);
      }
    }

    // Match each program
    for (const program of programs) {
      const normalizedCompany = normalizeCompanyName(program.company);

      // Try exact match on normalized company name
      let entries = vendorMap.get(normalizedCompany);

      // Fallback: try domain-based guess
      if (!entries) {
        const domain = resolvePrimaryDomain(program);
        if (domain) {
          const guess = domainToVendorGuess(domain);
          if (guess.length >= 3) {
            entries = vendorMap.get(guess);
          }
        }
      }

      if (!entries || entries.length === 0) continue;

      // Sort by dateAdded descending (most recent first)
      const sorted = [...entries].sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      );

      const vulnerabilities: KevVulnerability[] = sorted.map((e) => ({
        cveID: e.cveID,
        vendorProject: e.vendorProject,
        product: e.product,
        vulnerabilityName: e.vulnerabilityName,
        shortDescription: e.shortDescription,
        dateAdded: e.dateAdded,
        knownRansomwareCampaignUse: e.knownRansomwareCampaignUse === "Known",
      }));

      const ransomwareCount = vulnerabilities.filter(
        (v) => v.knownRansomwareCampaignUse,
      ).length;

      results.set(program.slug, {
        totalCount: vulnerabilities.length,
        ransomwareCount,
        vulnerabilities,
      });
    }

    log.info("cisa-kev", `Matched KEV data to ${results.size} programs`);
  } catch (err) {
    log.warn("cisa-kev", "Failed to load", err);
  }

  cachedResults = results;
  return results;
}
