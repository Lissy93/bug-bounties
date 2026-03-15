import type { APIRoute } from "astro";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Bug Bounties API",
    version: "1.0.0",
    description:
      "Consume our bug bounty data programmatically from your own applications, via our free, no-auth, no-CORS REST API.",
    license: {
      name: "MIT",
      url: "https://github.com/lissy93/bug-bounties/blob/main/LICENSE",
    },
  },
  servers: [{ url: "https://bug-bounties.as93.net" }],
  paths: {
    "/api/programs.json": {
      get: {
        operationId: "listPrograms",
        summary: "List all programs",
        description:
          "Returns all bug bounty programs in a lean shape with tranco rank and KEV count.",
        responses: {
          "200": {
            description: "List of all programs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    meta: {
                      type: "object",
                      properties: {
                        total: {
                          type: "integer",
                          description: "Total number of programs",
                        },
                        generated: {
                          type: "string",
                          format: "date-time",
                          description: "Build timestamp",
                        },
                      },
                    },
                    programs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ListProgram" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/programs/{slug}.json": {
      get: {
        operationId: "getProgram",
        summary: "Get program details",
        description:
          "Returns full details and enrichment data for a single program.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: 'Program slug (e.g. "apple", "google")',
          },
        ],
        responses: {
          "200": {
            description: "Program details with enrichment",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    program: { $ref: "#/components/schemas/Program" },
                    enrichment: { $ref: "#/components/schemas/Enrichment" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/stats.json": {
      get: {
        operationId: "getStats",
        summary: "Aggregate statistics",
        description: "Returns aggregate statistics computed from all programs.",
        responses: {
          "200": {
            description: "Aggregate stats",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Stats" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ListProgram: {
        type: "object",
        properties: {
          company: { type: "string" },
          url: { type: "string", format: "uri" },
          slug: { type: "string" },
          rewards: {
            type: "array",
            items: {
              type: "string",
              enum: ["*bounty", "*recognition", "*swag"],
            },
          },
          min_payout: { type: ["number", "null"] },
          max_payout: { type: ["number", "null"] },
          currency: { type: ["string", "null"] },
          safe_harbor: {
            type: ["string", "null"],
            enum: ["full", "partial", null],
          },
          managed: { type: ["boolean", "null"] },
          domains: { type: "array", items: { type: "string" } },
          tranco_rank: {
            type: ["integer", "null"],
            description: "Tranco site popularity rank",
          },
          kev_count: {
            type: "integer",
            description: "Number of known exploited vulnerabilities",
          },
        },
      },
      Program: {
        type: "object",
        description: "Full program data with all available fields.",
        properties: {
          company: { type: "string" },
          url: { type: "string", format: "uri" },
          slug: { type: "string" },
          handle: { type: "string" },
          program: { type: "string" },
          contact: { type: "string" },
          rewards: { type: "array", items: { type: "string" } },
          min_payout: { type: "number" },
          max_payout: { type: "number" },
          currency: { type: "string" },
          safe_harbor: { type: "string" },
          allows_disclosure: { type: "boolean" },
          managed: { type: "boolean" },
          response_time: { type: "number" },
          bounty_time: { type: "number" },
          resolution_time: { type: "number" },
          response_efficiency: { type: "number" },
          launch_date: { type: "string" },
          confidentiality_level: { type: "string" },
          domains: { type: "array", items: { type: "string" } },
          pgp_key: { type: "string" },
          securitytxt_url: { type: "string" },
          preferred_languages: { type: "string" },
          hiring: { type: "boolean" },
          notes: { type: "string" },
          sources: { type: "array", items: { type: "string" } },
          description: { type: "string" },
          program_type: { type: "string", enum: ["bounty", "vdp", "hybrid"] },
          status: { type: "string", enum: ["active", "paused"] },
          scope: {
            type: "array",
            items: {
              type: "object",
              properties: {
                target: { type: "string" },
                type: { type: "string" },
              },
            },
          },
          out_of_scope: { type: "array", items: { type: "string" } },
          testing_policy_url: { type: "string" },
          excluded_methods: { type: "array", items: { type: "string" } },
          requires_account: { type: "boolean" },
          payout_table: {
            type: "object",
            properties: {
              critical: { type: "number" },
              high: { type: "number" },
              medium: { type: "number" },
              low: { type: "number" },
            },
          },
          disclosure_timeline_days: { type: "number" },
          response_sla_days: { type: "number" },
          legal_terms_url: { type: "string" },
          hall_of_fame_url: { type: "string" },
          swag_details: { type: "string" },
          reporting_url: { type: "string" },
          standards: { type: "array", items: { type: "string" } },
        },
      },
      Enrichment: {
        type: "object",
        properties: {
          tranco_rank: { type: ["integer", "null"] },
          security_txt: {
            type: ["object", "null"],
            properties: {
              contact: { type: "array", items: { type: "string" } },
              encryption: { type: "array", items: { type: "string" } },
              acknowledgments: { type: "string" },
              preferredLanguages: { type: "string" },
              hiring: { type: "string" },
              expires: { type: "string" },
              policy: { type: "string" },
              canonical: { type: "string" },
              raw_url: { type: "string" },
              is_expired: { type: "boolean" },
            },
          },
          platform_scope: {
            type: ["object", "null"],
            properties: {
              scope_stats: {
                type: "object",
                properties: {
                  total: { type: "integer" },
                  web: { type: "integer" },
                  mobile: { type: "integer" },
                  api: { type: "integer" },
                  other: { type: "integer" },
                },
              },
              in_scope_targets: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    identifier: { type: "string" },
                    type: { type: "string" },
                    eligibleForBounty: { type: "boolean" },
                  },
                },
              },
              out_of_scope_targets: {
                type: "array",
                items: { type: "string" },
              },
              allows_bounty_splitting: { type: ["boolean", "null"] },
              max_severity: { type: ["string", "null"] },
            },
          },
          kev: {
            type: ["object", "null"],
            properties: {
              totalCount: { type: "integer" },
              ransomwareCount: { type: "integer" },
              vulnerabilities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    cveID: { type: "string" },
                    vendorProject: { type: "string" },
                    product: { type: "string" },
                    vulnerabilityName: { type: "string" },
                    shortDescription: { type: "string" },
                    dateAdded: { type: "string" },
                    knownRansomwareCampaignUse: { type: "boolean" },
                    epssScore: { type: "number" },
                    epssPercentile: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
      Stats: {
        type: "object",
        properties: {
          generated: { type: "string", format: "date-time" },
          total_programs: { type: "integer" },
          with_bounties: { type: "integer" },
          with_safe_harbor: { type: "integer" },
          with_managed: { type: "integer" },
          reward_types: {
            type: "object",
            properties: {
              bounty: { type: "integer" },
              recognition: { type: "integer" },
              swag: { type: "integer" },
            },
          },
          payout_range: {
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" },
              currency: { type: "string" },
            },
          },
          programs_with_kev: { type: "integer" },
          programs_with_tranco: { type: "integer" },
        },
      },
    },
  },
};

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(spec), {
    headers: { "Content-Type": "application/json" },
  });
};
