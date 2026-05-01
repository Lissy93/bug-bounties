import type { ForgeLookupSource } from "./types";
import {
  forgeSecurityMd,
  forgeOwner,
  forgeAdvisories,
  forgeCommitEmails,
  forgeIssueTemplates,
} from "./sources/forge";

export const forgeTier1: ForgeLookupSource[] = [
  forgeSecurityMd,
  forgeOwner,
  forgeAdvisories,
];

export const forgeTier2: ForgeLookupSource[] = [
  forgeCommitEmails,
  forgeIssueTemplates,
];

export const forgeSkipT2Only = new Set(["forge-security-md"]);
