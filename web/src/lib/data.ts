import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { slugify, resetSlugs } from "./slugify";
import type { BountyProgram } from "../types/Company";

let cached: BountyProgram[] | null = null;

export function loadBounties(): BountyProgram[] {
  if (cached) return cached;

  const platformPath = path.resolve(
    process.cwd(),
    "..",
    "platform-programs.yml",
  );
  const independentPath = path.resolve(
    process.cwd(),
    "..",
    "independent-programs.yml",
  );

  const platformRaw = fs.readFileSync(platformPath, "utf-8");
  const platformParsed = yaml.load(platformRaw) as {
    companies: Record<string, unknown>[];
  };

  let allCompanies = platformParsed.companies || [];

  if (fs.existsSync(independentPath)) {
    const independentRaw = fs.readFileSync(independentPath, "utf-8");
    const independentParsed = yaml.load(independentRaw) as {
      companies: Record<string, unknown>[];
    };
    if (independentParsed?.companies) {
      allCompanies = allCompanies.concat(independentParsed.companies);
    }
  }

  resetSlugs();

  cached = allCompanies
    .filter((entry) => {
      if (!entry.company || typeof entry.company !== "string") return false;
      if (!entry.url || typeof entry.url !== "string") return false;
      try {
        new URL(entry.url as string);
      } catch {
        return false;
      }
      return true;
    })
    .map((entry) => ({
      ...entry,
      slug: slugify(entry.company as string),
    })) as BountyProgram[];

  return cached;
}
