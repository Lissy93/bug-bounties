const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV !== "production";

type Level = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: Level;
  tag: string;
  msg: string;
  error?: string;
  timestamp: string;
}

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
let minLevel: number = isDev ? LEVELS.debug : LEVELS.error;
let handler: ((entry: LogEntry) => void) | null = null;

export function setLogLevel(level: Level) {
  minLevel = LEVELS[level];
}

export function setLogHandler(fn: (entry: LogEntry) => void) {
  handler = fn;
}

const COLORS: Record<Level, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function time() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function emit(level: Level, tag: string, msg: string, err?: unknown) {
  if (LEVELS[level] < minLevel) return;
  const errorStr =
    err instanceof Error ? err.message : err ? String(err) : undefined;
  const entry: LogEntry = {
    level,
    tag,
    msg,
    error: errorStr,
    timestamp: new Date().toISOString(),
  };

  if (handler) handler(entry);

  const fn = level === "debug" ? "log" : level;
  if (isDev) {
    const c = COLORS[level];
    const detail = errorStr ? `: ${errorStr}` : "";
    console[fn](
      `${DIM}${time()}${RESET} ${c}[${level}]${RESET} --> ${tag}: ${msg}${detail}`,
    );
  } else {
    console[fn](JSON.stringify(entry));
  }
}

export const log = {
  debug: (tag: string, msg: string) => emit("debug", tag, msg),
  info: (tag: string, msg: string) => emit("info", tag, msg),
  warn: (tag: string, msg: string, err?: unknown) =>
    emit("warn", tag, msg, err),
  error: (tag: string, msg: string, err?: unknown) =>
    emit("error", tag, msg, err),
};
