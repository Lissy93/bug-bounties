import { inflateRaw } from 'node:zlib';
import { promisify } from 'node:util';
import type { BountyProgram } from '../types/Company';
import { resolvePrimaryDomain } from './domain';
import { log } from './log';

const inflateRawAsync = promisify(inflateRaw);

const TRANCO_URL = 'https://tranco-list.eu/top-1m.csv.zip';

let cachedRanks: Map<string, number> | null = null;

/**
 * Extract and decompress the first file from a ZIP archive buffer.
 */
async function extractFirstFileFromZip(zip: Buffer): Promise<Buffer> {
  if (zip.length < 30 || zip[0] !== 0x50 || zip[1] !== 0x4b || zip[2] !== 0x03 || zip[3] !== 0x04) {
    throw new Error('Not a valid ZIP file');
  }

  const compressionMethod = zip.readUInt16LE(8);
  const compressedSize = zip.readUInt32LE(18);
  const filenameLength = zip.readUInt16LE(26);
  const extraLength = zip.readUInt16LE(28);
  const dataOffset = 30 + filenameLength + extraLength;

  if (dataOffset + compressedSize > zip.length) {
    throw new Error('ZIP file truncated');
  }

  const data = zip.subarray(dataOffset, dataOffset + compressedSize);

  if (compressionMethod === 0) return data;
  if (compressionMethod === 8) return await inflateRawAsync(data);

  throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
}

async function downloadAndParse(): Promise<Map<string, number>> {
  const ranks = new Map<string, number>();

  const res = await fetch(TRANCO_URL);
  if (!res.ok || !res.body) {
    log.warn('tranco', `Failed to download list: HTTP ${res.status}`);
    return ranks;
  }

  const zipBuffer = Buffer.from(await res.arrayBuffer());
  const csvBuffer = await extractFirstFileFromZip(zipBuffer);

  const text = csvBuffer.toString('utf-8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1) continue;
    const rank = parseInt(trimmed.slice(0, commaIdx), 10);
    const domain = trimmed.slice(commaIdx + 1).trim().toLowerCase();
    if (rank > 0 && domain) {
      ranks.set(domain, rank);
    }
  }

  return ranks;
}

export { formatRankLabel, formatRankBadge } from './tranco-format';

/**
 * Load the Tranco list and build a lookup map keyed by program slug.
 * Never throws - returns empty map on failure.
 */
export async function fetchTrancoRanks(
  programs: BountyProgram[],
): Promise<{ bySlug: Map<string, number> }> {
  try {
    if (!cachedRanks) {
      cachedRanks = await downloadAndParse();
      log.info('tranco', `Loaded ${cachedRanks.size} domain ranks`);
    }

    const bySlug = new Map<string, number>();
    for (const p of programs) {
      const domain = resolvePrimaryDomain(p);
      if (!domain) continue;
      const rank = cachedRanks.get(domain.toLowerCase());
      if (rank != null) {
        bySlug.set(p.slug, rank);
      }
    }

    return { bySlug };
  } catch (err) {
    log.warn('tranco', 'Failed to load', err);
    cachedRanks = new Map();
    return { bySlug: new Map() };
  }
}
