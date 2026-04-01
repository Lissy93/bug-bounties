import type {
  LookupSource,
  LookupResult,
  LookupResponse,
  ResolvedDomain,
  SummaryItem,
} from "./types";

const PHASE_TIMEOUT = 10_000;
const PER_SOURCE_TIMEOUT = 5_000;

type SourceOutcome =
  | { ok: true; name: string; result: LookupResult | null }
  | { ok: false; name: string; error: string };

async function runPhase(
  ctx: ResolvedDomain,
  sources: LookupSource[],
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
    val.result.contacts = val.result.contacts.filter((c) => {
      const key = `${c.type}:${c.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const hasContacts = val.result.contacts.length > 0;
    const hasMeta = !!val.result.metadata;
    if (hasContacts || hasMeta) results.push(val.result);
    summary.push({
      item: val.name,
      status: hasContacts ? "found" : hasMeta ? "partial" : "missing",
    });
  }

  return { results, errors, summary };
}

export async function runLookup(
  ctx: ResolvedDomain,
  tier1: LookupSource[],
  tier2: LookupSource[],
): Promise<LookupResponse> {
  const seen = new Set<string>();
  const t1 = collect(await runPhase(ctx, tier1), seen);
  const hasT1Contacts = t1.results.some((r) => r.contacts.length > 0);

  const t2 = hasT1Contacts
    ? {
        results: [],
        errors: [],
        summary: tier2.map(
          (s): SummaryItem => ({ item: s.name, status: "skipped" }),
        ),
      }
    : collect(await runPhase(ctx, tier2), seen);

  return {
    domain: ctx.domain,
    queried_at: new Date().toISOString(),
    results: [...t1.results, ...t2.results],
    errors: [...t1.errors, ...t2.errors],
    summary: [...t1.summary, ...t2.summary],
  };
}
