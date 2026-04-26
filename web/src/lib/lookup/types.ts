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

export interface ResolvedRepo {
  owner: string;
  repo: string;
  slug: string;
  fullUrl: string;
  defaultBranch?: string;
  homepage?: string;
}

export interface GitHubLookupSource {
  name: string;
  tier: 1 | 2;
  execute(ctx: ResolvedRepo, signal: AbortSignal): Promise<LookupResult | null>;
}

/* ── Package registries (npm, PyPI, crates.io) ── */

export type PackageRegistry = "npm" | "pypi" | "crates";

export interface ResolvedPackage {
  registry: PackageRegistry;
  name: string;
  slug: string;
  registryUrl: string;
}

export interface PackageLookupSource {
  name: string;
  tier: 1 | 2;
  execute(
    ctx: ResolvedPackage,
    signal: AbortSignal,
  ): Promise<LookupResult | null>;
}

/* ── Forge repositories (GitLab, Codeberg) ── */

export type ForgeHost = "gitlab" | "codeberg";

export interface ResolvedForgeRepo {
  host: ForgeHost;
  owner: string;
  repo: string;
  projectPath: string;
  slug: string;
  fullUrl: string;
  apiBase: string;
}

export interface ForgeLookupSource {
  name: string;
  tier: 1 | 2;
  execute(
    ctx: ResolvedForgeRepo,
    signal: AbortSignal,
  ): Promise<LookupResult | null>;
}

/* ── Mobile apps (Play Store, App Store) ── */

export type AppStore = "play" | "appstore";

export interface ResolvedApp {
  store: AppStore;
  packageId: string;
  slug: string;
  storeUrl: string;
}

export interface AppLookupSource {
  name: string;
  tier: 1 | 2;
  execute(ctx: ResolvedApp, signal: AbortSignal): Promise<LookupResult | null>;
}
