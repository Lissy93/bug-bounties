export type Reward = '*bounty' | '*recognition' | '*swag';

/** Minimal program shape serialized to the homepage HTML. */
export interface ListProgram {
  company: string;
  url: string;
  slug: string;
  handle?: string;
  rewards?: Reward[];
  min_payout?: number;
  max_payout?: number;
  currency?: string;
  safe_harbor?: string;
  managed?: boolean;
  domains?: string[];
  completeness: number;
}

export interface BountyProgram {
  company: string;
  url: string;
  slug: string;
  handle?: string;
  program?: string;
  contact?: string;
  rewards?: Reward[];
  min_payout?: number;
  max_payout?: number;
  currency?: string;
  safe_harbor?: string;
  allows_disclosure?: boolean;
  managed?: boolean;
  response_time?: number;
  bounty_time?: number;
  resolution_time?: number;
  response_efficiency?: number;
  launch_date?: string;
  confidentiality_level?: string;
  domains?: string[];
  pgp_key?: string;
  securitytxt_url?: string;
  preferred_languages?: string;
  hiring?: boolean;
  notes?: string;
  sources?: string[];
}

// Enrichment data types - fetched at build time, not stored in bounties.yml

export interface SecurityTxtData {
  contact?: string[];
  encryption?: string[];
  acknowledgments?: string;
  preferredLanguages?: string;
  hiring?: string;
  expires?: string;
  policy?: string;
  canonical?: string;
  raw_url?: string;
  is_expired?: boolean;
}

export interface ScopeTarget {
  identifier: string;
  type: string;
  eligibleForBounty: boolean;
}

export interface ScopeStats {
  total: number;
  web: number;
  mobile: number;
  api: number;
  other: number;
}

export interface PlatformScopeData {
  scopeStats: ScopeStats;
  inScopeTargets: ScopeTarget[];
  outOfScopeTargets: string[];
  allowsBountySplitting?: boolean;
  maxSeverity?: string;
  // Metadata enrichment fields
  minPayout?: number;
  maxPayout?: number;
  currency?: string;
  managed?: boolean;
  safeHarbor?: string;
  allowsDisclosure?: boolean;
  responseTime?: number;
  bountyTime?: number;
  resolutionTime?: number;
  responseEfficiency?: number;
  confidentialityLevel?: string;
  domains?: string[];
  handle?: string;
  rewards?: Reward[];
}

export interface DiscloseData {
  safeHarbor?: string;
  pgpKey?: string;
  securitytxtUrl?: string;
  preferredLanguages?: string;
  hiring?: boolean;
  launchDate?: string;
}

export interface KevVulnerability {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  shortDescription: string;
  dateAdded: string;
  knownRansomwareCampaignUse: boolean;
  epssScore?: number;
  epssPercentile?: number;
}

export interface KevData {
  totalCount: number;
  ransomwareCount: number;
  vulnerabilities: KevVulnerability[];
}
