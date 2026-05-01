import type { PackageLookupSource } from "./types";
import { npmRegistry, pypiRegistry, cratesRegistry } from "./sources/package";

export const pkgTier1: PackageLookupSource[] = [
  npmRegistry,
  pypiRegistry,
  cratesRegistry,
];

export const pkgTier2: PackageLookupSource[] = [];

export const pkgSkipT2Only = new Set([
  "npm-registry",
  "pypi-registry",
  "crates-registry",
]);
