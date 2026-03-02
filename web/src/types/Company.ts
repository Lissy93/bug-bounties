export type Reward = '*bounty' | '*recognition' | '*swag';

export interface BountyProgram {
  company: string;
  url: string;
  slug: string;
  handle?: string;
  program?: string;
  contact?: string;
  rewards?: Reward[];
  min_payout?: number;
  max_payout?: number;
  currency?: string;
  safe_harbor?: string;
  allows_disclosure?: boolean;
  managed?: boolean;
  response_time?: number;
  bounty_time?: number;
  resolution_time?: number;
  response_efficiency?: number;
  launch_date?: string;
  confidentiality_level?: string;
  domains?: string[];
  pgp_key?: string;
  securitytxt_url?: string;
  preferred_languages?: string;
  hiring?: boolean;
  notes?: string;
  sources?: string[];
}
