import { loadBounties } from "./data";
import { fetchTrancoRanks } from "./tranco";
import { fetchCisaKev } from "./cisa-kev";
import { fetchAllPlatformData, deriveSources } from "./platform-data";
import { fetchDiscloseData } from "./disclose-data";
import { fetchAllSecurityTxt } from "./security-txt";
import { fetchEpssScores } from "./epss";
import { log } from "./log";
import type {
  BountyProgram,
  ListProgram,
  SecurityTxtData,
  PlatformScopeData,
  KevData,
} from "@app-types/Company";

export interface AllProgramData {
  programs: BountyProgram[];
  listPrograms: ListProgram[];
  trancoRanks: Record<string, number>;
  kevCounts: Record<string, number>;
  securityTxtMap: Map<string, SecurityTxtData>;
  platformDataMap: Map<string, PlatformScopeData>;
  kevMap: Map<string, KevData>;
}

const completeness = (p: BountyProgram) =>
  Object.values(p).filter(
    (v) => v != null && v !== "" && !(Array.isArray(v) && !v.length),
  ).length;

let cached: AllProgramData | null = null;

export async function loadAllPrograms(): Promise<AllProgramData> {
  if (cached) return cached;

  const rawPrograms = loadBounties();
  const isDev = import.meta.env.DEV;

  const trancoRanks: Record<string, number> = {};
  const kevCounts: Record<string, number> = {};
  let securityTxtMap = new Map<string, SecurityTxtData>();
  let platformDataMap = new Map<string, PlatformScopeData>();
  let kevMap = new Map<string, KevData>();
  let programs: BountyProgram[] = rawPrograms;

  try {
    const [
      secTxtResult,
      platformResult,
      trancoData,
      kevResult,
      epssScores,
      discloseMap,
    ] = await Promise.all([
      isDev
        ? Promise.resolve(new Map<string, SecurityTxtData>())
        : fetchAllSecurityTxt(rawPrograms),
      fetchAllPlatformData(rawPrograms),
      fetchTrancoRanks(rawPrograms),
      fetchCisaKev(rawPrograms),
      fetchEpssScores(),
      fetchDiscloseData(rawPrograms),
    ]);

    securityTxtMap = secTxtResult;
    platformDataMap = platformResult;
    kevMap = kevResult;

    // Build tranco ranks lookup
    for (const [slug, rank] of trancoData.bySlug) {
      trancoRanks[slug] = rank;
    }

    // Build KEV counts lookup
    for (const [slug, data] of kevMap) {
      kevCounts[slug] = data.totalCount;
    }

    // Merge EPSS scores into KEV vulnerability entries
    for (const kevData of kevMap.values()) {
      for (const vuln of kevData.vulnerabilities) {
        const epss = epssScores.get(vuln.cveID);
        if (epss) {
          vuln.epssScore = epss.score;
          vuln.epssPercentile = epss.percentile;
        }
      }
    }

    // Enrich programs with platform + Disclose metadata
    programs = rawPrograms.map((p) => {
      const pd = platformResult.get(p.slug);
      const dd = discloseMap.get(p.slug);
      if (!pd && !dd) return p;

      const enriched: BountyProgram = { ...p };

      if (pd) {
        enriched.min_payout ??= pd.minPayout;
        enriched.max_payout ??= pd.maxPayout;
        enriched.currency ??= pd.currency;
        enriched.managed ??= pd.managed;
        enriched.safe_harbor ??= pd.safeHarbor;
        enriched.allows_disclosure ??= pd.allowsDisclosure;
        enriched.response_time ??= pd.responseTime;
        enriched.bounty_time ??= pd.bountyTime;
        enriched.resolution_time ??= pd.resolutionTime;
        enriched.response_efficiency ??= pd.responseEfficiency;
        enriched.confidentiality_level ??= pd.confidentialityLevel;
        enriched.handle ??= pd.handle;
        if (!enriched.rewards?.length && pd.rewards?.length) {
          enriched.rewards = pd.rewards;
        }
        if (!enriched.domains?.length && pd.domains?.length) {
          enriched.domains = pd.domains;
        }
      }

      if (dd) {
        enriched.safe_harbor ??= dd.safeHarbor;
        enriched.pgp_key ??= dd.pgpKey;
        enriched.securitytxt_url ??= dd.securitytxtUrl;
        enriched.preferred_languages ??= dd.preferredLanguages;
        enriched.hiring ??= dd.hiring;
        enriched.launch_date ??= dd.launchDate;
      }

      // Derive sources from URL
      if (!enriched.sources?.length) {
        const derived = deriveSources(enriched.url);
        if (derived.length) enriched.sources = derived;
      }

      return enriched;
    });
  } catch (err) {
    log.warn("loadAllPrograms", "Failed to load enrichment data", err);
  }

  const listPrograms: ListProgram[] = programs.map((p) => ({
    company: p.company,
    url: p.url,
    slug: p.slug,
    handle: p.handle,
    rewards: p.rewards,
    min_payout: p.min_payout,
    max_payout: p.max_payout,
    currency: p.currency,
    safe_harbor: p.safe_harbor,
    managed: p.managed,
    domains: p.domains,
    completeness: completeness(p),
  }));

  cached = {
    programs,
    listPrograms,
    trancoRanks,
    kevCounts,
    securityTxtMap,
    platformDataMap,
    kevMap,
  };
  return cached;
}
