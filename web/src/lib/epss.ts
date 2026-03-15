import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { log } from "./log";

const gunzipAsync = promisify(gunzip);

const EPSS_URL = "https://epss.cyentia.com/epss_scores-current.csv.gz";

export interface EpssEntry {
  score: number;
  percentile: number;
}

let cachedScores: Map<string, EpssEntry> | null = null;

/**
 * Download and parse the daily EPSS scores CSV.
 * Returns a Map from CVE ID to score/percentile. Never throws.
 */
export async function fetchEpssScores(): Promise<Map<string, EpssEntry>> {
  if (cachedScores) return cachedScores;

  const scores = new Map<string, EpssEntry>();

  try {
    const res = await fetch(EPSS_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      log.warn("epss", `Failed to download scores: HTTP ${res.status}`);
      cachedScores = scores;
      return scores;
    }

    const compressed = Buffer.from(await res.arrayBuffer());
    const decompressed = await gunzipAsync(compressed);
    const text = decompressed.toString("utf-8");

    for (const line of text.split("\n")) {
      // Skip comment lines (start with #) and header
      if (line.startsWith("#") || line.startsWith("cve,")) continue;
      const trimmed = line.trim();
      if (!trimmed) continue;

      const firstComma = trimmed.indexOf(",");
      if (firstComma === -1) continue;
      const secondComma = trimmed.indexOf(",", firstComma + 1);
      if (secondComma === -1) continue;

      const cve = trimmed.slice(0, firstComma);
      const score = parseFloat(trimmed.slice(firstComma + 1, secondComma));
      const percentile = parseFloat(trimmed.slice(secondComma + 1));

      if (cve.startsWith("CVE-") && !isNaN(score) && !isNaN(percentile)) {
        scores.set(cve, { score, percentile });
      }
    }

    log.info("epss", `Loaded ${scores.size} EPSS scores`);
  } catch (err) {
    log.warn("epss", "Failed to load", err);
  }

  cachedScores = scores;
  return scores;
}
