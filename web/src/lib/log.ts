const PREFIX = "[enrichment]";

export const log = {
  info(tag: string, msg: string) {
    console.log(`${PREFIX}[${tag}] ${msg}`);
  },
  warn(tag: string, msg: string, err?: unknown) {
    const suffix =
      err instanceof Error ? `: ${err.message}` : err ? `: ${err}` : "";
    console.warn(`${PREFIX}[${tag}] ${msg}${suffix}`);
  },
};
