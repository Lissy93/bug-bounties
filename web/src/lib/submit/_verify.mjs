import yaml from 'js-yaml';
import fs from 'fs';
import { scenarios } from './scenarios.mjs';

const which = process.argv[2];
const expected = scenarios[which]();
const text = fs.readFileSync(`/tmp/submit-test/inserted-${which}.yml`, 'utf8');
const parsed = yaml.load(text);
const entry = Array.isArray(parsed) ? parsed[0] : parsed;

const issues = [];

function check(field, expectedVal, actualVal, transform = (x) => x) {
  const e = transform(expectedVal);
  const a = actualVal;
  if (e === undefined && a === undefined) return;
  if (JSON.stringify(e) !== JSON.stringify(a)) {
    issues.push(`  ${field}: expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`);
  }
}

// Trim transformer
const T = (s) => typeof s === 'string' ? s.trim() : s;
const TLIST = (s) => typeof s === 'string' ? s.split(/\r?\n/).map(l => l.trim()).filter(Boolean) : undefined;
const TBOOL = (s) => s === 'true' ? true : s === 'false' ? false : undefined;
const TINT = (s) => {
  if (typeof s !== 'string' || !s.trim()) return undefined;
  const n = parseInt(s.trim(), 10);
  return Number.isFinite(n) ? n : undefined;
};

check('company', expected.company, entry.company, T);
check('url', expected.url, entry.url, (s) => s ? (s.trim().startsWith('http') ? s.trim() : `https://${s.trim()}`) : undefined);
if (expected.contact?.trim()) {
  const c = expected.contact.trim();
  const expectedContact = c.startsWith('http') || c.startsWith('mailto:') ? c : c.includes('@') ? `mailto:${c}` : `https://${c}`;
  check('contact', expectedContact, entry.contact);
}
check('description', expected.description, entry.description, T);
check('rewards', expected.rewards?.length ? expected.rewards : undefined, entry.rewards);
check('program_type', expected.program_type || undefined, entry.program_type, T);
check('status', expected.status || undefined, entry.status, T);
check('safe_harbor', expected.safe_harbor || undefined, entry.safe_harbor, T);
check('allows_disclosure', TBOOL(expected.allows_disclosure), entry.allows_disclosure);
check('requires_account', TBOOL(expected.requires_account), entry.requires_account);
check('domains', TLIST(expected.domains), entry.domains);
check('out_of_scope', TLIST(expected.out_of_scope), entry.out_of_scope);
check('standards', TLIST(expected.standards), entry.standards);
check('excluded_methods', expected.excluded_methods?.length ? expected.excluded_methods : undefined, entry.excluded_methods);
check('min_payout', TINT(expected.min_payout), entry.min_payout);
check('max_payout', TINT(expected.max_payout), entry.max_payout);
check('currency', expected.currency?.trim() || undefined, entry.currency);
check('disclosure_timeline_days', TINT(expected.disclosure_timeline_days), entry.disclosure_timeline_days);
check('response_sla_days', TINT(expected.response_sla_days), entry.response_sla_days);
check('preferred_languages', expected.preferred_languages?.trim() || undefined, entry.preferred_languages);
check('swag_details', expected.swag_details?.trim() || undefined, entry.swag_details);

const expectedScope = (expected.scope || []).filter(r => r.target?.trim() && r.type?.trim()).map(r => ({ target: r.target.trim(), type: r.type.trim() }));
check('scope', expectedScope.length ? expectedScope : undefined, entry.scope);

const payoutTable = {};
for (const k of ['critical', 'high', 'medium', 'low']) {
  const v = TINT(expected[`payout_${k}`]);
  if (v !== undefined) payoutTable[k] = v;
}
check('payout_table', Object.keys(payoutTable).length ? payoutTable : undefined, entry.payout_table);

for (const url of ['testing_policy_url', 'legal_terms_url', 'hall_of_fame_url', 'reporting_url', 'pgp_key']) {
  const v = expected[url]?.trim();
  if (v) {
    const expectedV = v.startsWith('http') ? v : `https://${v}`;
    check(url, expectedV, entry[url]);
  }
}

if (issues.length === 0) {
  console.log(`OK  ${which}`);
} else {
  console.log(`MISMATCH  ${which}`);
  issues.forEach(i => console.log(i));
}
