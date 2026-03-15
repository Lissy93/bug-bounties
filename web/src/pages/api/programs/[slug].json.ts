import type { APIRoute, GetStaticPaths } from "astro";
import { loadAllPrograms } from "../../../lib/load-all-programs";
import type {
  BountyProgram,
  SecurityTxtData,
  PlatformScopeData,
  KevData,
} from "../../../types/Company";

interface Props {
  program: BountyProgram;
  trancoRank: number | null;
  securityTxt: SecurityTxtData | null;
  platformData: PlatformScopeData | null;
  kevData: KevData | null;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { programs, trancoRanks, securityTxtMap, platformDataMap, kevMap } =
    await loadAllPrograms();

  return programs.map((program) => ({
    params: { slug: program.slug },
    props: {
      program,
      trancoRank: trancoRanks[program.slug] ?? null,
      securityTxt: securityTxtMap.get(program.slug) ?? null,
      platformData: platformDataMap.get(program.slug) ?? null,
      kevData: kevMap.get(program.slug) ?? null,
    },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { program, trancoRank, securityTxt, platformData, kevData } =
    props as Props;

  return new Response(
    JSON.stringify({
      program,
      enrichment: {
        tranco_rank: trancoRank,
        security_txt: securityTxt,
        platform_scope: platformData
          ? {
              scope_stats: platformData.scopeStats,
              in_scope_targets: platformData.inScopeTargets,
              out_of_scope_targets: platformData.outOfScopeTargets,
              allows_bounty_splitting:
                platformData.allowsBountySplitting ?? null,
              max_severity: platformData.maxSeverity ?? null,
            }
          : null,
        kev: kevData,
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
};
