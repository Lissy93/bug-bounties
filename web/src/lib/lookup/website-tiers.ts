import type { LookupSource } from "./types";
import {
  securityTxt,
  bountyDb,
  discloseIo,
  githubSecurity,
  platformCheck,
  csaf,
  dnsSecurity,
  httpHeaders,
  rdap,
  dmarc,
  rfc2142,
  sslCert,
  homepage,
  dnsSoa,
  commonPages,
  dnsTxt,
  robotsHumans,
} from "./sources";

export const webTier1: LookupSource[] = [
  securityTxt,
  bountyDb,
  discloseIo,
  githubSecurity,
  platformCheck,
  csaf,
  dnsSecurity,
  httpHeaders,
];

export const webTier2: LookupSource[] = [
  rdap,
  dmarc,
  rfc2142,
  sslCert,
  homepage,
  dnsSoa,
  commonPages,
  dnsTxt,
  robotsHumans,
];
