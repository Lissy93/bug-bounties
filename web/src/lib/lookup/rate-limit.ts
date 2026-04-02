const WINDOWS = [
  { max: 8, ms: 60_000, label: "minute" },
  { max: 100, ms: 3600_000, label: "hour" },
  { max: 300, ms: 86400_000, label: "day" },
] as const;

const hits = new Map<string, number[]>();
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  const maxWindow = WINDOWS[WINDOWS.length - 1].ms;
  for (const [key, times] of hits) {
    const filtered = times.filter((t) => now - t < maxWindow);
    if (filtered.length) hits.set(key, filtered);
    else hits.delete(key);
  }
}

export function checkRateLimit(
  ip: string,
): { ok: true } | { ok: false; retryAfter: number; message: string } {
  cleanup();
  const now = Date.now();
  const times = hits.get(ip) || [];

  for (const w of WINDOWS) {
    const inWindow = times.filter((t) => now - t < w.ms);
    if (inWindow.length >= w.max) {
      const oldest = Math.min(...inWindow);
      const retryAfter = Math.ceil((oldest + w.ms - now) / 1000);
      return {
        ok: false,
        retryAfter,
        message: `Rate limit exceeded (${w.max} per ${w.label})`,
      };
    }
  }

  times.push(now);
  hits.set(ip, times);
  return { ok: true };
}
