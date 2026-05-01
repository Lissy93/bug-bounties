const DIACRITICS = /\p{Diacritic}/gu;

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(DIACRITICS, "");
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
