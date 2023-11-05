
export type Reward = 'bounty' | 'recognition' | 'swag' | 'other';

export interface Company {
  company: string; // Company name
  url: string; // The path to their security page
  contact: string; // Either an email or URL to contact them on
  rewards?: Reward[]; // The rewards they offer
  notes?: string; // Any additional info
}

export type Companies = Company[];
