import type { BountyProgram, PlatformScopeData, ScopeTarget, ScopeStats } from '../types/Company';
import { log } from './log';

const GITHUB_RAW = 'https://raw.githubusercontent.com';
const SOURCES = {
  hackerone: `${GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/hackerone_data.json`,
  bugcrowd: `${GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/bugcrowd_data.json`,
  intigriti: `${GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/intigriti_data.json`,
};

const H1_TYPE_MAP: Record<string, string> = {
  URL: 'web',
  WILDCARD: 'web',
  CIDR: 'other',
  IP_ADDRESS: 'other',
  APPLE_STORE_APP_ID: 'mobile',
  GOOGLE_PLAY_APP_ID: 'mobile',
  OTHER: 'other',
  SOURCE_CODE: 'other',
  DOWNLOADABLE_EXECUTABLES: 'other',
  WINDOWS_APP_STORE_APP_ID: 'other',
  TESTFLIGHT: 'mobile',
  HARDWARE: 'other',
  AI_MODEL: 'other',
};

const BC_TYPE_MAP: Record<string, string> = {
  website: 'web',
  api: 'api',
  android: 'mobile',
  ios: 'mobile',
  other: 'other',
  hardware: 'other',
};

const INTIGRITI_TYPE_MAP: Record<string, string> = {
  url: 'web',
  'mobile-application': 'mobile',
  'ip-range': 'other',
  other: 'other',
  device: 'other',
};

interface RawHackerOneProgram {
  name?: string;
  handle?: string;
  url?: string;
  website?: string;
  targets?: { safe_harbors?: unknown[]; in_scope?: RawH1Target[]; out_of_scope?: RawH1Target[] };
  allows_bounty_splitting?: boolean;
  max_severity?: string;
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
  targets?: { in_scope?: RawIntigritiTarget[]; out_of_scope?: RawIntigritiTarget[] };
}

interface RawIntigritiTarget {
  name?: string;
  type?: string;
  endpoint?: string;
  description?: string;
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

const SCOPE_CATEGORIES = new Set(['web', 'mobile', 'api', 'other']);

function computeStats(targets: ScopeTarget[]): ScopeStats {
  const stats: ScopeStats = { total: targets.length, web: 0, mobile: 0, api: 0, other: 0 };
  for (const t of targets) {
    if (SCOPE_CATEGORIES.has(t.type)) {
      (stats as Record<string, number>)[t.type]++;
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
    identifier: t.asset_identifier || 'unknown',
    type: H1_TYPE_MAP[t.asset_type || ''] || 'other',
    eligibleForBounty: t.eligible_for_bounty ?? false,
  }));

  const outOfScope = (program.targets?.out_of_scope || [])
    .map((t) => t.asset_identifier || '')
    .filter(Boolean);

  return {
    scopeStats: computeStats(targets),
    inScopeTargets: targets.slice(0, 20),
    outOfScopeTargets: outOfScope,
    allowsBountySplitting: program.allows_bounty_splitting,
    maxSeverity: program.max_severity,
  };
}

function normalizeBC(program: RawBugcrowdProgram): PlatformScopeData | null {
  const inScope = program.targets?.in_scope;
  if (!inScope?.length) return null;

  const targets: ScopeTarget[] = inScope.map((t) => ({
    identifier: t.name || t.uri || 'unknown',
    type: BC_TYPE_MAP[(t.type || '').toLowerCase()] || 'other',
    eligibleForBounty: true,
  }));

  const outOfScope = (program.targets?.out_of_scope || [])
    .map((t) => t.name || t.uri || '')
    .filter(Boolean);

  return {
    scopeStats: computeStats(targets),
    inScopeTargets: targets.slice(0, 20),
    outOfScopeTargets: outOfScope,
  };
}

function normalizeIntigriti(program: RawIntigritiProgram): PlatformScopeData | null {
  const inScope = program.targets?.in_scope;
  if (!inScope?.length) return null;

  const targets: ScopeTarget[] = inScope.map((t) => ({
    identifier: t.name || t.endpoint || 'unknown',
    type: INTIGRITI_TYPE_MAP[(t.type || '').toLowerCase()] || 'other',
    eligibleForBounty: true,
  }));

  const outOfScope = (program.targets?.out_of_scope || [])
    .map((t) => t.name || t.endpoint || '')
    .filter(Boolean);

  return {
    scopeStats: computeStats(targets),
    inScopeTargets: targets.slice(0, 20),
    outOfScopeTargets: outOfScope,
  };
}

function extractHandle(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'hackerone.com') {
      return u.pathname.replace(/^\//, '').split('/')[0].toLowerCase();
    }
    if (u.hostname === 'bugcrowd.com') {
      return u.pathname.replace(/^\//, '').split('/')[0].toLowerCase();
    }
    if (u.hostname === 'app.intigriti.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 3) return parts[1].toLowerCase();
      return parts[parts.length - 1]?.toLowerCase() || null;
    }
  } catch {
    return null;
  }
  return null;
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
    log.info('platform-data', 'Fetching upstream JSON from 3 platforms...');
    const [h1Data, bcData, intigritiData] = await Promise.all([
      fetchJSON<RawHackerOneProgram[]>(SOURCES.hackerone),
      fetchJSON<RawBugcrowdProgram[]>(SOURCES.bugcrowd),
      fetchJSON<RawIntigritiProgram[]>(SOURCES.intigriti),
    ]);

    const h1ByHandle = new Map<string, RawHackerOneProgram>();
    if (h1Data) {
      for (const p of h1Data) {
        const handle = (p.handle || '').toLowerCase();
        if (handle) h1ByHandle.set(handle, p);
      }
    }

    const bcByPath = new Map<string, RawBugcrowdProgram>();
    if (bcData) {
      for (const p of bcData) {
        const url = p.url || '';
        const path = url.startsWith('/') ? url.slice(1).toLowerCase() : url.replace(/^https?:\/\/bugcrowd\.com\//, '').toLowerCase();
        if (path) bcByPath.set(path.split('/')[0], p);
      }
    }

    const intigritiByHandle = new Map<string, RawIntigritiProgram>();
    if (intigritiData) {
      for (const p of intigritiData) {
        const handle = (p.company_handle || p.handle || '').toLowerCase();
        if (handle) intigritiByHandle.set(handle, p);
      }
    }

    const results = new Map<string, PlatformScopeData>();

    for (const program of programs) {
      const sources = program.sources || [];
      let data: PlatformScopeData | null = null;

      if (sources.includes('hackerone')) {
        const handle = program.handle?.toLowerCase() || extractHandle(program.url);
        if (handle) {
          const raw = h1ByHandle.get(handle);
          if (raw) data = normalizeH1(raw);
        }
      } else if (sources.includes('bugcrowd')) {
        const handle = extractHandle(program.url) || program.handle?.toLowerCase();
        if (handle) {
          const raw = bcByPath.get(handle);
          if (raw) data = normalizeBC(raw);
        }
      } else if (sources.includes('intigriti')) {
        const handle = program.handle?.toLowerCase() || extractHandle(program.url);
        if (handle) {
          const raw = intigritiByHandle.get(handle);
          if (raw) data = normalizeIntigriti(raw);
        }
      }

      if (data && data.scopeStats.total > 0) {
        results.set(program.slug, data);
      }
    }

    log.info('platform-data', `Matched scope data for ${results.size} programs`);
    cachedResult = results;
    return results;
  } catch (err) {
    log.warn('platform-data', 'Failed to load', err);
    cachedResult = new Map();
    return cachedResult;
  }
}
