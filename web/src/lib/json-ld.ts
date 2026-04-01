// Shared constants
const SITE_URL = "https://bug-bounties.as93.net";
const SITE_NAME = "Bug Bounties";

const publisher = {
  "@type": "Organization" as const,
  name: "Alicia Sykes",
  logo: {
    "@type": "ImageObject" as const,
    url: "https://github.com/lissy93.png",
  },
};

const siteOrg = {
  "@type": "Organization" as const,
  name: SITE_NAME,
  url: SITE_URL,
};

// Breadcrumb helpers

interface BreadcrumbItem {
  name: string;
  path: string;
}

function breadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList" as const,
    itemListElement: [
      {
        "@type": "ListItem" as const,
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      ...items.map((item, i) => ({
        "@type": "ListItem" as const,
        position: i + 2,
        name: item.name,
        item: `${SITE_URL}${item.path}`,
      })),
    ],
  };
}

function graph(...nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

// Page-specific schemas

export function defaultSchema(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: SITE_URL,
    name: SITE_NAME,
    description,
    publisher,
  };
}

export function homeSchema(description: string) {
  return graph(
    {
      "@type": "WebSite",
      url: SITE_URL,
      name: SITE_NAME,
      description,
      publisher,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/lookup/{search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    breadcrumbList([]),
  );
}

export function aboutSchema() {
  return graph(breadcrumbList([{ name: "About", path: "/about" }]));
}

export function companySchema(opts: {
  company: string;
  slug: string;
  url: string;
  description?: string;
}) {
  return graph(
    breadcrumbList([{ name: opts.company, path: `/${opts.slug}` }]),
    {
      "@type": "Organization",
      name: opts.company,
      url: opts.url,
      ...(opts.description ? { description: opts.description } : {}),
    },
  );
}

export function learnSchema(
  glossaryTerms: { term: string; definition: string }[],
) {
  return graph(
    {
      "@type": "Article",
      headline: "Bug Bounty Reporting Guide",
      description:
        "A practical guide to writing and submitting your first bug bounty report.",
      datePublished: "2026-01-15",
      dateModified: "2026-03-15",
      author: siteOrg,
      publisher: siteOrg,
      mainEntityOfPage: `${SITE_URL}/learn`,
    },
    breadcrumbList([{ name: "Learn", path: "/learn" }]),
    {
      "@type": "DefinedTermSet",
      name: "Bug Bounty Glossary",
      description:
        "Key terms used in bug bounty and vulnerability disclosure programs.",
      hasDefinedTerm: glossaryTerms.map((item) => ({
        "@type": "DefinedTerm",
        name: item.term,
        description: item.definition,
      })),
    },
  );
}

export function lookupSchema(description: string) {
  return graph(
    {
      "@type": "WebApplication",
      name: "Security Contact Lookup",
      url: `${SITE_URL}/lookup`,
      description,
      applicationCategory: "SecurityApplication",
    },
    breadcrumbList([{ name: "Lookup", path: "/lookup" }]),
  );
}

export function lookupResultSchema(domain?: string) {
  const items: BreadcrumbItem[] = [{ name: "Lookup", path: "/lookup" }];
  if (domain) {
    items.push({ name: domain, path: `/lookup/${domain}` });
  }
  return graph(breadcrumbList(items));
}
