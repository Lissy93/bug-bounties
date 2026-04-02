import { log } from "../log";
import type {
  LookupSource,
  LookupResult,
  LookupResponse,
  ResolvedDomain,
  ResolvedRepo,
  GitHubLookupSource,
  SummaryItem,
} from "./types";

const PHASE_TIMEOUT = 10_000;
const PER_SOURCE_TIMEOUT = 5_000;

interface AnySource<T> {
  name: string;
  tier: 1 | 2;
  execute(ctx: T, signal: AbortSignal): Promise<LookupResult | null>;
}

type SourceOutcome =
  | { ok: true; name: string; result: LookupResult | null }
  | { ok: false; name: string; error: string };

async function runPhase<T>(
  ctx: T,
  sources: AnySource<T>[],
): Promise<SourceOutcome[]> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PHASE_TIMEOUT);
  const settled = await Promise.allSettled(
    sources.map(async (src): Promise<SourceOutcome> => {
      const srcAc = new AbortController();
      const t = setTimeout(() => srcAc.abort(), PER_SOURCE_TIMEOUT);
      ac.signal.addEventListener("abort", () => srcAc.abort(), { once: true });
      try {
        return {
          ok: true,
          name: src.name,
          result: await src.execute(ctx, srcAc.signal),
        };
      } catch (err) {
        log.warn("lookup", `Source ${src.name} failed`, err);
        return {
          ok: false,
          name: src.name,
          error: err instanceof Error ? err.message : String(err),
        };
      } finally {
        clearTimeout(t);
      }
    }),
  );
  clearTimeout(timer);
  return settled
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<SourceOutcome>).value);
}

function collect(outcomes: SourceOutcome[], seen: Set<string>) {
  const results: LookupResult[] = [];
  const errors: { source: string; error: string }[] = [];
  const summary: SummaryItem[] = [];

  for (const val of outcomes) {
    if (!val.ok) {
      errors.push({ source: val.name, error: val.error });
      summary.push({ item: val.name, status: "error" });
      continue;
    }
    if (!val.result || (!val.result.contacts.length && !val.result.metadata)) {
      summary.push({ item: val.name, status: "missing" });
      continue;
    }
    /* Track duplicates but keep contacts on each source card so every
       card shows what it found.  The seen set is still used to determine
       the summary status: a source whose contacts were ALL already seen
       by an earlier source is "partial" (corroborating), not "found". */
    const hasContacts = val.result.contacts.length > 0;
    let hasNew = false;
    for (const c of val.result.contacts) {
      const key = `${c.type}:${c.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        hasNew = true;
      }
    }
    const hasMeta = !!val.result.metadata;
    if (hasContacts || hasMeta) results.push(val.result);
    summary.push({
      item: val.name,
      status: hasContacts
        ? hasNew
          ? "found"
          : "partial"
        : hasMeta
          ? "partial"
          : "missing",
    });
  }

  return { results, errors, summary };
}

export async function runLookup(
  ctx: ResolvedDomain,
  tier1: LookupSource[],
  tier2: LookupSource[],
  deep = false,
): Promise<LookupResponse> {
  return runTiered(ctx.domain, ctx, tier1, tier2, undefined, deep);
}

export async function runGitHubLookup(
  ctx: ResolvedRepo,
  tier1: GitHubLookupSource[],
  tier2: GitHubLookupSource[],
  skipT2Only?: Set<string>,
  deep = false,
): Promise<LookupResponse> {
  return runTiered(ctx.slug, ctx, tier1, tier2, skipT2Only, deep);
}

async function runTiered<T>(
  label: string,
  ctx: T,
  tier1: AnySource<T>[],
  tier2: AnySource<T>[],
  skipT2Only?: Set<string>,
  deep = false,
): Promise<LookupResponse> {
  const seen = new Set<string>();
  const t1 = collect(await runPhase(ctx, tier1), seen);

  /* In deep mode, always run tier 2.  Otherwise skip tier 2 when sources
     that represent definitive security channels found contacts. */
  const hasStrongT1 =
    !deep &&
    t1.results.some(
      (r) => r.contacts.length > 0 && (!skipT2Only || skipT2Only.has(r.source)),
    );

  const t2 = hasStrongT1
    ? {
        results: [],
        errors: [],
        summary: tier2.map(
          (s): SummaryItem => ({ item: s.name, status: "skipped" }),
        ),
      }
    : collect(await runPhase(ctx, tier2), seen);

  return {
    domain: label,
    queried_at: new Date().toISOString(),
    results: [...t1.results, ...t2.results],
    errors: [...t1.errors, ...t2.errors],
    summary: [...t1.summary, ...t2.summary],
  };
}
