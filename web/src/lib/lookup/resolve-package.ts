import type { PackageRegistry, ResolvedPackage } from "./types";

const NPM_RE = /npmjs\.com\/package\/(@?[^/\s#?]+(?:\/[^/\s#?]+)?)/;
const PYPI_RE = /pypi\.org\/project\/([^/\s#?]+)/;
const CRATES_RE = /crates\.io\/crates\/([^/\s#?]+)/;

const VALID_NPM = /^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i;
const VALID_PYPI = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;
const VALID_CRATE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

const REGISTRY_URLS: Record<PackageRegistry, (name: string) => string> = {
  npm: (n) => `https://www.npmjs.com/package/${n}`,
  pypi: (n) => `https://pypi.org/project/${n}/`,
  crates: (n) => `https://crates.io/crates/${n}`,
};

function validateName(name: string, registry: PackageRegistry): void {
  const re =
    registry === "npm"
      ? VALID_NPM
      : registry === "pypi"
        ? VALID_PYPI
        : VALID_CRATE;
  if (!re.test(name)) {
    throw new Error(`Invalid ${registry} package name: ${name}`);
  }
}

export function resolvePackageFromUrl(input: string): ResolvedPackage | null {
  const npm = input.match(NPM_RE);
  if (npm) return buildResolved("npm", npm[1]);

  const pypi = input.match(PYPI_RE);
  if (pypi) return buildResolved("pypi", pypi[1]);

  const crates = input.match(CRATES_RE);
  if (crates) return buildResolved("crates", crates[1]);

  return null;
}

export function resolvePackage(
  name: string,
  registry: PackageRegistry,
): ResolvedPackage {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Missing package name");
  validateName(trimmed, registry);
  return buildResolved(registry, trimmed);
}

function buildResolved(
  registry: PackageRegistry,
  name: string,
): ResolvedPackage {
  validateName(name, registry);
  return {
    registry,
    name,
    slug: `${registry}/${name}`,
    registryUrl: REGISTRY_URLS[registry](name),
  };
}
