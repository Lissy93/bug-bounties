import type {
  BountyProgram,
  PlatformScopeData,
  Reward,
  ScopeTarget,
  ScopeStats,
} from "../types/Company";
import { log } from "./log";

const GITHUB_RAW = "https://raw.githubusercontent.com";
const SOURCES = {
  hackerone: `${GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/hackerone_data.json`,
  bugcrowd: `${GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/bugcrowd_data.json`,
  intigriti: `${GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/intigriti_data.json`,
  yeswehack: `${GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/yeswehack_data.json`,
  federacy: `${GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/federacy_data.json`,
};

const H1_TYPE_MAP: Record<string, string> = {
  URL: "web",
  WILDCARD: "web",
  CIDR: "other",
  IP_ADDRESS: "other",
  APPLE_STORE_APP_ID: "mobile",
  GOOGLE_PLAY_APP_ID: "mobile",
  OTHER: "other",
  SOURCE_CODE: "other",
  DOWNLOADABLE_EXECUTABLES: "other",
  WINDOWS_APP_STORE_APP_ID: "other",
  TESTFLIGHT: "mobile",
  HARDWARE: "other",
  AI_MODEL: "other",
};

const BC_TYPE_MAP: Record<string, string> = {
  website: "web",
  api: "api",
  android: "mobile",
  ios: "mobile",
  other: "other",
  hardware: "other",
};

const INTIGRITI_TYPE_MAP: Record<string, string> = {
  url: "web",
  "mobile-application": "mobile",
  "ip-range": "other",
  other: "other",
  device: "other",
};

const YWH_TYPE_MAP: Record<string, string> = {
  "web-application": "web",
  api: "api",
  "mobile-application-ios": "mobile",
  "mobile-application-android": "mobile",
  "open-source": "other",
  application: "other",
  other: "other",
};

const FEDERACY_TYPE_MAP: Record<string, string> = {
  website: "web",
  api: "api",
  mobile: "mobile",
  desktop: "other",
};

interface RawHackerOneProgram {
  name?: string;
  handle?: string;
  url?: string;
  website?: string;
  submission_state?: string;
  targets?: {
    safe_harbors?: unknown[];
    in_scope?: RawH1Target[];
    out_of_scope?: RawH1Target[];
  };
  allows_bounty_splitting?: boolean;
  max_severity?: string;
  offers_bounties?: boolean;
  offers_swag?: boolean;
  managed_program?: boolean;
  average_time_to_first_program_response?: number;
  average_time_to_bounty_awarded?: number;
  average_time_to_report_resolved?: number;
  response_efficiency_percentage?: number;
}

interface RawH1Target {
  asset_identifier?: string;
  asset_type?: string;
  eligible_for_bounty?: boolean;
  eligible_for_submission?: boolean;
  instruction?: string;
  max_severity?: string;
}

interface RawBugcrowdProgram {
  name?: string;
  url?: string;
  targets?: { in_scope?: RawBCTarget[]; out_of_scope?: RawBCTarget[] };
  max_payout?: number | { value?: number };
  allows_disclosure?: boolean;
  managed_by_bugcrowd?: boolean;
  safe_harbor?: string;
}

interface RawBCTarget {
  name?: string;
  type?: string;
  uri?: string;
}

interface RawIntigritiProgram {
  name?: string;
  handle?: string;
  company_handle?: string;
  url?: string;
  status?: string;
  targets?: {
    in_scope?: RawIntigritiTarget[];
    out_of_scope?: RawIntigritiTarget[];
  };
  max_bounty?: number | { value?: number; currency?: string };
  min_bounty?: number | { value?: number; currency?: string };
  confidentiality_level?: string;
}

interface RawIntigritiTarget {
  name?: string;
  type?: string;
  endpoint?: string;
  description?: string;
}

interface RawSimpleTarget {
  target?: string;
  type?: string;
}

interface RawYesWeHackProgram {
  id?: string;
  slug?: string;
  name?: string;
  disabled?: boolean;
  targets?: { in_scope?: RawSimpleTarget[]; out_of_scope?: RawSimpleTarget[] };
  max_bounty?: number;
  min_bounty?: number;
  managed?: boolean;
}

interface RawFederacyProgram {
  name?: string;
  url?: string;
  targets?: { in_scope?: RawSimpleTarget[]; out_of_scope?: RawSimpleTarget[] };
  offers_awards?: boolean;
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function safeNum(val: unknown): number | undefined {
  if (val == null) return undefined;
  if (typeof val === "number") return val > 0 ? val : undefined;
  if (typeof val === "object" && val !== null && "value" in val) {
    const v = (val as { value?: unknown }).value;
    return typeof v === "number" && v > 0 ? v : undefined;
  }
  return undefined;
}

function safeCurrency(val: unknown): string | undefined {
  if (typeof val === "object" && val !== null && "currency" in val) {
    const c = (val as { currency?: unknown }).currency;
    return typeof c === "string" && c ? c : undefined;
  }
  return undefined;
}

function extractDomains(targets: ScopeTarget[]): string[] {
  const domains = new Set<string>();
  for (const t of targets) {
    try {
      const id = t.identifier;
      if (id.includes("://")) {
        const host = new URL(id).hostname.replace(/^www\./, "");
        if (host.includes(".")) domains.add(host);
      } else {
        const cleaned = id
          .replace(/^\*\./, "")
          .split("/")[0]
          .toLowerCase()
          .trim();
        if (cleaned.includes(".")) domains.add(cleaned);
      }
    } catch {
      /* skip */
    }
  }
  return domains.size > 0 ? [...domains].sort() : [];
}

const SCOPE_CATEGORIES = new Set(["web", "mobile", "api", "other"]);

function computeStats(targets: ScopeTarget[]): ScopeStats {
  const stats: ScopeStats = {
    total: targets.length,
    web: 0,
    mobile: 0,
    api: 0,
    other: 0,
  };
  for (const t of targets) {
    if (SCOPE_CATEGORIES.has(t.type)) {
      (stats as unknown as Record<string, number>)[t.type]++;
    } else {
      stats.other++;
    }
  }
  return stats;
}

function normalizeH1(program: RawHackerOneProgram): PlatformScopeData | null {
  const inScope = program.targets?.in_scope;
  if (!inScope?.length) return null;

  const targets: ScopeTarget[] = inScope.map((t) => ({
    identifier: t.asset_identifier || "unknown",
    type: H1_TYPE_MAP[t.asset_type || ""] || "other",
    eligibleForBounty: t.eligible_for_bounty ?? false,
  }));

  const outOfScope = (program.targets?.out_of_scope || [])
    .map((t) => t.asset_identifier || "")
    .filter(Boolean);

  const rewards: Reward[] = [];
  if (program.offers_bounties) rewards.push("*bounty");
  if (program.offers_swag) rewards.push("*swag");
  const domains = extractDomains(targets);

  return {
    scopeStats: computeStats(targets),
    inScopeTargets: targets.slice(0, 20),
    outOfScopeTargets: outOfScope,
    allowsBountySplitting: program.allows_bounty_splitting,
    maxSeverity: program.max_severity,
    managed: program.managed_program,
    handle: program.handle?.toLowerCase(),
    rewards: rewards.length > 0 ? rewards : undefined,
    domains: domains.length > 0 ? domains : undefined,
    responseTime: program.average_time_to_first_program_response,
    bountyTime: program.average_time_to_bounty_awarded,
    resolutionTime: program.average_time_to_report_resolved,
    responseEfficiency: program.response_efficiency_percentage,
  };
}

function normalizeBC(program: RawBugcrowdProgram): PlatformScopeData | null {
  const inScope = program.targets?.in_scope;
  if (!inScope?.length) return null;

  const targets: ScopeTarget[] = inScope.map((t) => ({
    identifier: t.name || t.uri || "unknown",
    type: BC_TYPE_MAP[(t.type || "").toLowerCase()] || "other",
    eligibleForBounty: true,
  }));

  const outOfScope = (program.targets?.out_of_scope || [])
    .map((t) => t.name || t.uri || "")
    .filter(Boolean);

  const maxPayout = safeNum(program.max_payout);
  const rewards: Reward[] = maxPayout ? ["*bounty"] : [];
  const domains = extractDomains(targets);

  return {
    scopeStats: computeStats(targets),
    inScopeTargets: targets.slice(0, 20),
    outOfScopeTargets: outOfScope,
    maxPayout,
    rewards: rewards.length > 0 ? rewards : undefined,
    domains: domains.length > 0 ? domains : undefined,
    safeHarbor: program.safe_harbor || undefined,
    allowsDisclosure: program.allows_disclosure,
    managed: program.managed_by_bugcrowd,
  };
}

function normalizeIntigriti(
  program: RawIntigritiProgram,
): PlatformScopeData | null {
  const inScope = program.targets?.in_scope;
  if (!inScope?.length) return null;

  const targets: ScopeTarget[] = inScope.map((t) => ({
    identifier: t.name || t.endpoint || "unknown",
    type: INTIGRITI_TYPE_MAP[(t.type || "").toLowerCase()] || "other",
    eligibleForBounty: true,
  }));

  const outOfScope = (program.targets?.out_of_scope || [])
    .map((t) => t.name || t.endpoint || "")
    .filter(Boolean);

  const maxPayout = safeNum(program.max_bounty);
  const minPayout = safeNum(program.min_bounty);
  const currency =
    safeCurrency(program.max_bounty) || safeCurrency(program.min_bounty);
  const rewards: Reward[] = maxPayout ? ["*bounty"] : [];
  const domains = extractDomains(targets);

  return {
    scopeStats: computeStats(targets),
    inScopeTargets: targets.slice(0, 20),
    outOfScopeTargets: outOfScope,
    maxPayout,
    minPayout,
    currency,
    rewards: rewards.length > 0 ? rewards : undefined,
    domains: domains.length > 0 ? domains : undefined,
    confidentialityLevel: program.confidentiality_level || undefined,
    handle:
      (program.company_handle || program.handle || "").toLowerCase() ||
      undefined,
  };
}

function normalizeSimpleScope(
  targets: { in_scope?: RawSimpleTarget[]; out_of_scope?: RawSimpleTarget[] },
  typeMap: Record<string, string>,
): PlatformScopeData | null {
  const inScope = targets.in_scope;
  if (!inScope?.length) return null;

  const normalized: ScopeTarget[] = inScope.map((t) => ({
    identifier: t.target || "unknown",
    type: typeMap[(t.type || "").toLowerCase()] || "other",
    eligibleForBounty: true,
  }));

  const outOfScope = (targets.out_of_scope || [])
    .map((t) => t.target || "")
    .filter(Boolean);

  const domains = extractDomains(normalized);

  return {
    scopeStats: computeStats(normalized),
    inScopeTargets: normalized.slice(0, 20),
    outOfScopeTargets: outOfScope,
    domains: domains.length > 0 ? domains : undefined,
  };
}

function normalizeYWH(program: RawYesWeHackProgram): PlatformScopeData | null {
  if (!program.targets) return null;
  const base = normalizeSimpleScope(program.targets, YWH_TYPE_MAP);
  if (!base) return null;

  const maxPayout =
    typeof program.max_bounty === "number" && program.max_bounty > 0
      ? program.max_bounty
      : undefined;
  const minPayout =
    typeof program.min_bounty === "number" && program.min_bounty > 0
      ? program.min_bounty
      : undefined;
  const rewards: Reward[] = maxPayout ? ["*bounty"] : [];

  return {
    ...base,
    maxPayout,
    minPayout,
    managed: program.managed,
    handle: (program.slug || program.id || "").toLowerCase() || undefined,
    rewards: rewards.length > 0 ? rewards : undefined,
  };
}

function normalizeFederacy(
  program: RawFederacyProgram,
): PlatformScopeData | null {
  if (!program.targets) return null;
  const base = normalizeSimpleScope(program.targets, FEDERACY_TYPE_MAP);
  if (!base) return null;

  const rewards: Reward[] = program.offers_awards ? ["*bounty"] : [];

  return {
    ...base,
    rewards: rewards.length > 0 ? rewards : undefined,
  };
}

function extractHandle(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "hackerone.com") {
      return u.pathname.replace(/^\//, "").split("/")[0].toLowerCase();
    }
    if (u.hostname === "bugcrowd.com") {
      return u.pathname.replace(/^\//, "").split("/")[0].toLowerCase();
    }
    if (u.hostname === "app.intigriti.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 3) return parts[1].toLowerCase();
      return parts[parts.length - 1]?.toLowerCase() || null;
    }
    if (u.hostname === "yeswehack.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      // URL pattern: /programs/{slug}
      if (parts.length >= 2 && parts[0] === "programs")
        return parts[1].toLowerCase();
      return parts[0]?.toLowerCase() || null;
    }
    if (u.hostname === "www.federacy.com" || u.hostname === "federacy.com") {
      return u.pathname.replace(/^\//, "").split("/")[0].toLowerCase() || null;
    }
  } catch {
    return null;
  }
  return null;
}

const PLATFORM_DOMAIN_MAP: [string, string][] = [
  ["hackerone.com", "hackerone"],
  ["bugcrowd.com", "bugcrowd"],
  ["app.intigriti.com", "intigriti"],
  ["intigriti.com", "intigriti"],
  ["yeswehack.com", "yeswehack"],
  ["federacy.com", "federacy"],
];

/**
 * Derive the platform source from a program's URL domain.
 */
export function deriveSources(url: string): string[] {
  try {
    const hostname = new URL(url).hostname;
    for (const [domain, source] of PLATFORM_DOMAIN_MAP) {
      if (hostname === domain || hostname.endsWith("." + domain))
        return [source];
    }
  } catch {
    /* ignore */
  }
  return [];
}

let cachedResult: Map<string, PlatformScopeData> | null = null;

/**
 * Fetch all platform data and build a lookup map keyed by program slug.
 * Call once at build time. Never throws.
 */
export async function fetchAllPlatformData(
  programs: BountyProgram[],
): Promise<Map<string, PlatformScopeData>> {
  if (cachedResult) return cachedResult;

  try {
    log.info("platform-data", "Fetching upstream JSON from 5 platforms...");
    const [h1Data, bcData, intigritiData, ywhData, federacyData] =
      await Promise.all([
        fetchJSON<RawHackerOneProgram[]>(SOURCES.hackerone),
        fetchJSON<RawBugcrowdProgram[]>(SOURCES.bugcrowd),
        fetchJSON<RawIntigritiProgram[]>(SOURCES.intigriti),
        fetchJSON<RawYesWeHackProgram[]>(SOURCES.yeswehack),
        fetchJSON<RawFederacyProgram[]>(SOURCES.federacy),
      ]);

    // Build lookup maps keyed by handle/slug
    const h1ByHandle = new Map<string, RawHackerOneProgram>();
    const h1ByName = new Map<string, RawHackerOneProgram>();
    if (h1Data) {
      for (const p of h1Data) {
        const handle = (p.handle || "").toLowerCase();
        if (handle) h1ByHandle.set(handle, p);
        const name = (p.name || "").toLowerCase().trim();
        if (name) h1ByName.set(name, p);
      }
    }

    const bcByPath = new Map<string, RawBugcrowdProgram>();
    const bcByName = new Map<string, RawBugcrowdProgram>();
    if (bcData) {
      for (const p of bcData) {
        const url = p.url || "";
        const path = url.startsWith("/")
          ? url.slice(1).toLowerCase()
          : url.replace(/^https?:\/\/bugcrowd\.com\//, "").toLowerCase();
        if (path) bcByPath.set(path.split("/")[0], p);
        const name = (p.name || "").toLowerCase().trim();
        if (name) bcByName.set(name, p);
      }
    }

    const intigritiByHandle = new Map<string, RawIntigritiProgram>();
    const intigritiByName = new Map<string, RawIntigritiProgram>();
    if (intigritiData) {
      for (const p of intigritiData) {
        const handle = (p.company_handle || p.handle || "").toLowerCase();
        if (handle) intigritiByHandle.set(handle, p);
        const name = (p.name || "").toLowerCase().trim();
        if (name) intigritiByName.set(name, p);
      }
    }

    const ywhById = new Map<string, RawYesWeHackProgram>();
    const ywhByName = new Map<string, RawYesWeHackProgram>();
    if (ywhData) {
      for (const p of ywhData) {
        const id = (p.slug || p.id || "").toLowerCase();
        if (id) ywhById.set(id, p);
        const name = (p.name || "").toLowerCase().trim();
        if (name) ywhByName.set(name, p);
      }
    }

    const federacyBySlug = new Map<string, RawFederacyProgram>();
    const federacyByName = new Map<string, RawFederacyProgram>();
    if (federacyData) {
      for (const p of federacyData) {
        try {
          const slug = new URL(p.url || "").pathname
            .replace(/^\//, "")
            .split("/")[0]
            .toLowerCase();
          if (slug) federacyBySlug.set(slug, p);
        } catch {
          /* skip malformed URLs */
        }
        const name = (p.name || "").toLowerCase().trim();
        if (name) federacyByName.set(name, p);
      }
    }

    const results = new Map<string, PlatformScopeData>();

    for (const program of programs) {
      const sources = deriveSources(program.url);
      const handle =
        program.handle?.toLowerCase() || extractHandle(program.url);
      const companyLower = program.company.toLowerCase().trim();
      let data: PlatformScopeData | null = null;

      // Try the platform indicated by URL first
      if (sources.includes("hackerone")) {
        if (handle) {
          const raw = h1ByHandle.get(handle);
          if (raw) data = normalizeH1(raw);
        }
      } else if (sources.includes("bugcrowd")) {
        if (handle) {
          const raw = bcByPath.get(handle);
          if (raw) data = normalizeBC(raw);
        }
      } else if (sources.includes("intigriti")) {
        if (handle) {
          const raw = intigritiByHandle.get(handle);
          if (raw) data = normalizeIntigriti(raw);
        }
      } else if (sources.includes("yeswehack")) {
        if (handle) {
          const raw = ywhById.get(handle);
          if (raw) data = normalizeYWH(raw);
        }
      } else if (sources.includes("federacy")) {
        if (handle) {
          const raw = federacyBySlug.get(handle);
          if (raw) data = normalizeFederacy(raw);
        }
      }

      // For non-platform URLs or unmatched programs, try matching by
      // handle across all platforms, then fall back to company name
      if (!data && handle) {
        const h1 = h1ByHandle.get(handle);
        if (h1) data = normalizeH1(h1);
        if (!data) {
          const bc = bcByPath.get(handle);
          if (bc) data = normalizeBC(bc);
        }
        if (!data) {
          const ig = intigritiByHandle.get(handle);
          if (ig) data = normalizeIntigriti(ig);
        }
        if (!data) {
          const ywh = ywhById.get(handle);
          if (ywh) data = normalizeYWH(ywh);
        }
        if (!data) {
          const fed = federacyBySlug.get(handle);
          if (fed) data = normalizeFederacy(fed);
        }
      }

      if (!data) {
        const h1 = h1ByName.get(companyLower);
        if (h1) data = normalizeH1(h1);
        if (!data) {
          const bc = bcByName.get(companyLower);
          if (bc) data = normalizeBC(bc);
        }
        if (!data) {
          const ig = intigritiByName.get(companyLower);
          if (ig) data = normalizeIntigriti(ig);
        }
        if (!data) {
          const ywh = ywhByName.get(companyLower);
          if (ywh) data = normalizeYWH(ywh);
        }
        if (!data) {
          const fed = federacyByName.get(companyLower);
          if (fed) data = normalizeFederacy(fed);
        }
      }

      if (data && data.scopeStats.total > 0) {
        results.set(program.slug, data);
      }
    }

    log.info(
      "platform-data",
      `Matched scope data for ${results.size} programs`,
    );
    cachedResult = results;
    return results;
  } catch (err) {
    log.warn("platform-data", "Failed to load", err);
    cachedResult = new Map();
    return cachedResult;
  }
}
