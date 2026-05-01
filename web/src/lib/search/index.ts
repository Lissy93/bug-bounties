import type { BountyProgram } from "@app-types/Company";
import {
  ALL_FIELDS,
  prepare,
  scoreProgram,
  type ScoredProgram,
  type SearchField,
} from "./score";
import { normalize, tokenize } from "./tokens";

export type SortMode = "relevance" | "name" | "popularity" | "payout";

export interface SearchFilters {
  hasBounty?: boolean;
  safeHarbor?: "full" | "partial";
  managed?: boolean;
  programType?: "bounty" | "vdp" | "hybrid";
}

export interface SearchOptions {
  q: string;
  fields?: SearchField[];
  sort?: SortMode;
  filters?: SearchFilters;
}

export interface SearchOutcome {
  scored: ScoredProgram[];
  tokens: string[];
}

function passesFilters(p: BountyProgram, f: SearchFilters): boolean {
  if (f.hasBounty && !p.rewards?.includes("*bounty")) return false;
  if (f.safeHarbor && p.safe_harbor !== f.safeHarbor) return false;
  if (f.managed != null && Boolean(p.managed) !== f.managed) return false;
  if (f.programType && p.program_type !== f.programType) return false;
  return true;
}

function compareScored(
  a: ScoredProgram,
  b: ScoredProgram,
  sort: SortMode,
  trancoRanks: Record<string, number>,
): number {
  if (sort === "name")
    return a.program.company.localeCompare(b.program.company);
  if (sort === "popularity") {
    const ra = trancoRanks[a.program.slug] ?? Infinity;
    const rb = trancoRanks[b.program.slug] ?? Infinity;
    if (ra !== rb) return ra - rb;
    return b.score - a.score;
  }
  if (sort === "payout") {
    const pa = a.program.max_payout ?? -Infinity;
    const pb = b.program.max_payout ?? -Infinity;
    if (pa !== pb) return pb - pa;
    return b.score - a.score;
  }
  if (b.score !== a.score) return b.score - a.score;
  return a.program.company.localeCompare(b.program.company);
}

export function searchPrograms(
  programs: BountyProgram[],
  opts: SearchOptions,
  trancoRanks: Record<string, number>,
): SearchOutcome {
  const tokens = tokenize(opts.q);
  if (!tokens.length) return { scored: [], tokens };

  const fields = opts.fields?.length ? opts.fields : ALL_FIELDS;
  const filters = opts.filters ?? {};
  const prepared = prepare(programs);
  const sort = opts.sort ?? "relevance";
  const phrase = tokens.length > 1 ? normalize(opts.q) : null;

  const scored: ScoredProgram[] = [];
  for (const pp of prepared) {
    if (!passesFilters(pp.program, filters)) continue;
    const s = scoreProgram(pp, tokens, phrase, fields);
    if (s) scored.push(s);
  }
  scored.sort((a, b) => compareScored(a, b, sort, trancoRanks));
  return { scored, tokens };
}

export { ALL_FIELDS, isSearchField } from "./score";
export type { SearchField, ScoredProgram } from "./score";
