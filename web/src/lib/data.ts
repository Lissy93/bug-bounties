import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { slugify, resetSlugs } from './slugify';
import type { BountyProgram } from '../types/Company';

let cached: BountyProgram[] | null = null;

export function loadBounties(): BountyProgram[] {
  if (cached) return cached;

  const yamlPath = path.resolve(process.cwd(), '..', 'bounties.yml');
  const raw = fs.readFileSync(yamlPath, 'utf-8');
  const parsed = yaml.load(raw) as { companies: Record<string, unknown>[] };

  resetSlugs();

  cached = (parsed.companies || [])
    .filter((entry) => {
      if (!entry.company || typeof entry.company !== 'string') return false;
      if (!entry.url || typeof entry.url !== 'string') return false;
      try { new URL(entry.url as string); } catch { return false; }
      return true;
    })
    .map((entry) => ({
      ...entry,
      slug: slugify(entry.company as string),
    })) as BountyProgram[];

  return cached;
}
