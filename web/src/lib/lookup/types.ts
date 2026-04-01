export interface ContactInfo {
  type: "email" | "url" | "phone" | "pgp_key";
  value: string;
  label?: string;
}

export interface LookupResult {
  source: string;
  tier: 1 | 2;
  contacts: ContactInfo[];
  metadata?: Record<string, unknown>;
  url?: string;
}

export interface LookupSource {
  name: string;
  tier: 1 | 2;
  execute(
    ctx: ResolvedDomain,
    signal: AbortSignal,
  ): Promise<LookupResult | null>;
}

export interface ResolvedDomain {
  domain: string;
  baseDomain: string;
  companyHint: string;
}

export type SummaryStatus =
  | "found"
  | "partial"
  | "missing"
  | "skipped"
  | "error";

export interface SummaryItem {
  item: string;
  status: SummaryStatus;
}

export interface LookupResponse {
  domain: string;
  queried_at: string;
  results: LookupResult[];
  errors: { source: string; error: string }[];
  summary: SummaryItem[];
}
