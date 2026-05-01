import type { GitHubLookupSource } from "./types";
import {
  securityMd,
  advisories,
  author,
  commitEmails,
  codeowners,
  issueTemplates,
} from "./sources/github";

export const ghTier1: GitHubLookupSource[] = [securityMd, advisories, author];

export const ghTier2: GitHubLookupSource[] = [
  commitEmails,
  codeowners,
  issueTemplates,
];

/** Only skip tier 2 when these security-specific sources find contacts. */
export const ghSkipT2Only = new Set([
  "github-security-md",
  "github-advisories",
]);
