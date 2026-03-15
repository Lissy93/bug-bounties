import type { APIRoute } from "astro";
import { loadAllPrograms } from "../../lib/load-all-programs";

export const GET: APIRoute = async () => {
  const { programs, trancoRanks, kevCounts } = await loadAllPrograms();

  const rewards = { bounty: 0, recognition: 0, swag: 0 };
  let withSafeHarbor = 0;
  let withManaged = 0;
  let minPayout = Infinity;
  let maxPayout = 0;

  for (const p of programs) {
    if (p.rewards?.includes("*bounty")) rewards.bounty++;
    if (p.rewards?.includes("*recognition")) rewards.recognition++;
    if (p.rewards?.includes("*swag")) rewards.swag++;
    if (p.safe_harbor) withSafeHarbor++;
    if (p.managed) withManaged++;
    if (p.max_payout != null && p.max_payout > 0) {
      if (p.max_payout < minPayout) minPayout = p.max_payout;
      if (p.max_payout > maxPayout) maxPayout = p.max_payout;
    }
  }

  return new Response(
    JSON.stringify({
      generated: new Date().toISOString(),
      total_programs: programs.length,
      with_bounties: rewards.bounty,
      with_safe_harbor: withSafeHarbor,
      with_managed: withManaged,
      reward_types: rewards,
      payout_range: {
        min: maxPayout ? minPayout : 0,
        max: maxPayout,
        currency: "USD",
      },
      programs_with_kev: Object.keys(kevCounts).length,
      programs_with_tranco: Object.keys(trancoRanks).length,
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
};
