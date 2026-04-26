import type { APIRoute } from "astro";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Bug Bounties API",
    version: "1.0.0",
    description:
      "Consume our bug bounty data programmatically from your own applications, via our free, no-auth, no-CORS REST API.",
    contact: {
      name: "Alicia Sykes",
      url: "https://github.com/lissy93/bug-bounties",
    },
    license: {
      name: "MIT",
      url: "https://github.com/lissy93/bug-bounties/blob/main/LICENSE",
    },
  },
  externalDocs: {
    description: "Source code on GitHub",
    url: "https://github.com/lissy93/bug-bounties",
  },
  servers: [
    { url: "https://bug-bounties.as93.net", description: "Production" },
    { url: "http://localhost:4321", description: "Development" },
  ],
  tags: [
    { name: "Programs", description: "Browse and search bug bounty programs" },
    {
      name: "Lookup",
      description:
        "Find security contacts for websites, repos, packages, and apps",
    },
    { name: "Meta", description: "API metadata and statistics" },
  ],
  paths: {
    "/api/programs.json": {
      get: {
        tags: ["Programs"],
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
                  required: ["meta", "programs"],
                  properties: {
                    meta: {
                      type: "object",
                      required: ["total", "generated"],
                      properties: {
                        total: {
                          type: "integer",
                          description: "Total number of programs",
                          example: 1042,
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
        tags: ["Programs"],
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
            description: "Program slug",
            example: "apple",
          },
        ],
        responses: {
          "200": {
            description: "Program details with enrichment",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["program", "enrichment"],
                  properties: {
                    program: { $ref: "#/components/schemas/Program" },
                    enrichment: { $ref: "#/components/schemas/Enrichment" },
                  },
                },
              },
            },
          },
          "404": {
            description: "Program not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/lookup": {
      get: {
        tags: ["Lookup"],
        operationId: "listLookupTypes",
        summary: "List lookup types",
        description:
          "Returns the available lookup endpoints (website, GitHub, package, forge, app).",
        responses: {
          "200": {
            description: "Available lookup types",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    lookups: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          endpoint: { type: "string" },
                          param: { type: "string" },
                          description: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/lookup/website": {
      get: {
        tags: ["Lookup"],
        operationId: "lookupWebsiteContacts",
        summary: "Find website contacts",
        description:
          "Accepts a URL or domain and searches 17 sources for security contact details. Tier 1 (verified security channels) is checked first; tier 2 (general contacts) only runs when tier 1 finds nothing.",
        parameters: [
          {
            name: "url",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Website URL or domain to look up",
            examples: {
              full_url: { value: "https://example.com", summary: "Full URL" },
              bare_domain: { value: "example.com", summary: "Bare domain" },
              subdomain: {
                value: "https://shop.example.com",
                summary: "Subdomain (resolves to parent)",
              },
            },
          },
          {
            name: "deep",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["true"] },
            description: "Run all tiers regardless of tier 1 results",
          },
        ],
        responses: {
          "200": {
            description: "Security contact lookup results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LookupResponse" },
                example: {
                  domain: "example.com",
                  queried_at: "2026-04-01T12:00:00.000Z",
                  results: [
                    {
                      source: "security-txt",
                      tier: 1,
                      url: "https://example.com/.well-known/security.txt",
                      contacts: [
                        {
                          type: "email",
                          value: "security@example.com",
                          label: "security.txt contact",
                        },
                      ],
                      metadata: {
                        policy: "https://example.com/security-policy",
                      },
                    },
                  ],
                  errors: [],
                  summary: [
                    { item: "security-txt", status: "found" },
                    { item: "bounty-db", status: "missing" },
                    { item: "rdap", status: "skipped" },
                  ],
                },
              },
            },
          },
          "400": {
            description:
              "Invalid input (bad URL, private IP, missing parameter)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Invalid hostname", status: 400 },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            headers: {
              "Retry-After": {
                description: "Seconds until the rate limit resets",
                schema: { type: "integer" },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: {
                  error: "Rate limit exceeded (8 per minute)",
                  status: 429,
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: { error: "Internal server error", status: 500 },
              },
            },
          },
        },
      },
    },
    "/api/lookup/github": {
      get: {
        tags: ["Lookup"],
        operationId: "lookupGitHubContacts",
        summary: "Find GitHub contacts",
        description:
          "Accepts a GitHub repository (owner/repo or full URL) and searches for security contacts via SECURITY.md, advisories, owner profile, commit emails, and more.",
        parameters: [
          {
            name: "repo",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "GitHub repository (owner/repo or full URL)",
            examples: {
              slug: {
                value: "expressjs/express",
                summary: "Owner/repo slug",
              },
              full_url: {
                value: "https://github.com/facebook/react",
                summary: "Full GitHub URL",
              },
            },
          },
          {
            name: "deep",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["true"] },
            description: "Run all tiers regardless of tier 1 results",
          },
        ],
        responses: {
          "200": {
            description: "GitHub security contact lookup results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LookupResponse" },
              },
            },
          },
          "400": {
            description: "Invalid input (bad repo format, missing parameter)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "401": {
            description: "GitHub token not configured",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            headers: {
              "Retry-After": {
                description: "Seconds until the rate limit resets",
                schema: { type: "integer" },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/lookup/package": {
      get: {
        tags: ["Lookup"],
        operationId: "lookupPackageContacts",
        summary: "Find package contacts",
        description:
          "Accepts a package name and registry (npm, pypi, or crates) and searches for security contacts via registry metadata, linked repository, and project homepage.",
        parameters: [
          {
            name: "name",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Package name",
            examples: {
              npm: { value: "express", summary: "npm package" },
              scoped_npm: {
                value: "@angular/core",
                summary: "Scoped npm package",
              },
              pypi: { value: "requests", summary: "PyPI package" },
              crates: { value: "serde", summary: "crates.io package" },
            },
          },
          {
            name: "registry",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["npm", "pypi", "crates"] },
            description: "Package registry",
          },
          {
            name: "deep",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["true"] },
            description: "Run all tiers regardless of tier 1 results",
          },
        ],
        responses: {
          "200": {
            description: "Package security contact lookup results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LookupResponse" },
              },
            },
          },
          "400": {
            description: "Invalid input (bad name, missing registry)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            headers: {
              "Retry-After": {
                description: "Seconds until the rate limit resets",
                schema: { type: "integer" },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/lookup/forge": {
      get: {
        tags: ["Lookup"],
        operationId: "lookupForgeContacts",
        summary: "Find GitLab/Codeberg contacts",
        description:
          "Accepts a GitLab or Codeberg repository URL and searches for security contacts via SECURITY.md, owner profile, advisories, commit history, and project homepage.",
        parameters: [
          {
            name: "repo",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Repository URL (gitlab.com/... or codeberg.org/...)",
            examples: {
              gitlab: {
                value: "gitlab.com/gitlab-org/gitlab",
                summary: "GitLab repository",
              },
              codeberg: {
                value: "codeberg.org/forgejo/forgejo",
                summary: "Codeberg repository",
              },
            },
          },
          {
            name: "deep",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["true"] },
            description: "Run all tiers regardless of tier 1 results",
          },
        ],
        responses: {
          "200": {
            description: "Forge repository security contact lookup results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LookupResponse" },
              },
            },
          },
          "400": {
            description: "Invalid input (bad URL, unsupported forge)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            headers: {
              "Retry-After": {
                description: "Seconds until the rate limit resets",
                schema: { type: "integer" },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/lookup/app": {
      get: {
        tags: ["Lookup"],
        operationId: "lookupAppContacts",
        summary: "Find mobile app contacts",
        description:
          "Accepts a mobile app package ID or numeric App Store ID and searches for security contacts via the Google Play Store or Apple App Store listing, plus the developer's website.",
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            schema: { type: "string" },
            description:
              "App package ID (e.g. com.whatsapp) or numeric App Store ID",
            examples: {
              play: {
                value: "com.whatsapp",
                summary: "Android package ID",
              },
              appstore: {
                value: "310633997",
                summary: "Numeric App Store ID",
              },
            },
          },
          {
            name: "store",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["play", "appstore"],
              default: "play",
            },
            description: "App store to search (defaults to play)",
          },
          {
            name: "deep",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["true"] },
            description: "Run all tiers regardless of tier 1 results",
          },
        ],
        responses: {
          "200": {
            description: "Mobile app security contact lookup results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LookupResponse" },
              },
            },
          },
          "400": {
            description: "Invalid input (bad ID, unsupported store)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            headers: {
              "Retry-After": {
                description: "Seconds until the rate limit resets",
                schema: { type: "integer" },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/stats.json": {
      get: {
        tags: ["Meta"],
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
      Error: {
        type: "object",
        required: ["error", "status"],
        properties: {
          error: {
            type: "string",
            description: "Human-readable error message",
          },
          status: {
            type: "integer",
            description: "HTTP status code",
            example: 400,
          },
        },
      },
      ListProgram: {
        type: "object",
        required: ["company", "url", "slug"],
        properties: {
          company: { type: "string", example: "Apple" },
          url: { type: "string", format: "uri" },
          slug: { type: "string", example: "apple" },
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
        required: ["company", "url", "slug"],
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
      LookupResponse: {
        type: "object",
        required: ["domain", "queried_at", "results", "errors", "summary"],
        properties: {
          domain: {
            type: "string",
            description:
              "Identifier for what was looked up (domain, repo slug, package slug, or app slug)",
            examples: [
              "example.com",
              "expressjs/express",
              "npm/express",
              "gitlab/gitlab-org/gitlab",
              "play/com.whatsapp",
            ],
          },
          queried_at: { type: "string", format: "date-time" },
          results: {
            type: "array",
            description:
              "Lookup results from sources that returned data. Each result has a tier field (1 = verified security contact, 2 = general/fallback).",
            items: { $ref: "#/components/schemas/LookupResult" },
          },
          errors: {
            type: "array",
            description: "Sources that failed during lookup",
            items: {
              type: "object",
              required: ["source", "error"],
              properties: {
                source: { type: "string" },
                error: { type: "string" },
              },
            },
          },
          summary: {
            type: "array",
            description: "Status of every check, in execution order.",
            items: { $ref: "#/components/schemas/SummaryItem" },
          },
        },
      },
      LookupResult: {
        type: "object",
        required: ["source", "tier", "contacts"],
        properties: {
          source: {
            type: "string",
            description: "Source identifier",
            enum: [
              "security-txt",
              "bounty-db",
              "disclose-io",
              "github-security",
              "platform-check",
              "csaf",
              "dns-security",
              "http-headers",
              "rdap",
              "dmarc",
              "rfc2142",
              "ssl-cert",
              "homepage",
              "dns-soa",
              "common-pages",
              "dns-txt",
              "robots-humans",
              "github-security-md",
              "github-advisories",
              "github-author",
              "github-commit-emails",
              "github-codeowners",
              "github-issue-templates",
              "npm-registry",
              "pypi-registry",
              "crates-registry",
              "forge-security-md",
              "forge-owner",
              "forge-advisories",
              "forge-commit-emails",
              "forge-issue-templates",
              "play-store",
              "app-store",
            ],
          },
          tier: {
            type: "integer",
            enum: [1, 2],
            description:
              "1 = verified security channel, 2 = general/fallback contact",
          },
          contacts: {
            type: "array",
            items: { $ref: "#/components/schemas/ContactInfo" },
          },
          metadata: {
            type: "object",
            description:
              "Source-specific extra data (program info, policy details, etc.)",
            additionalProperties: true,
          },
          url: {
            type: "string",
            format: "uri",
            description: "Where the data was found",
          },
        },
      },
      ContactInfo: {
        type: "object",
        required: ["type", "value"],
        properties: {
          type: {
            type: "string",
            enum: ["email", "url", "phone", "pgp_key"],
            description: "Contact method type",
          },
          value: {
            type: "string",
            description: "Contact address, URL, or phone number",
          },
          label: {
            type: "string",
            description: "Human-readable description of this contact",
          },
        },
      },
      SummaryItem: {
        type: "object",
        required: ["item", "status"],
        properties: {
          item: { type: "string", description: "Source name" },
          status: {
            type: "string",
            enum: ["found", "partial", "missing", "skipped", "error"],
            description:
              "found = has contacts, partial = metadata only, missing = no data, skipped = tier 2 bypassed, error = source failed",
          },
        },
      },
      Stats: {
        type: "object",
        required: ["generated", "total_programs"],
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
