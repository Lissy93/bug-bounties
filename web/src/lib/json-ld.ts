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

export function learnSchema() {
  return graph(
    {
      "@type": "CollectionPage",
      name: "Bug Bounty Learn Hub",
      description:
        "Guides, references, and OSINT tooling for bug bounty hunters and security researchers.",
      url: `${SITE_URL}/learn`,
      publisher: siteOrg,
    },
    breadcrumbList([{ name: "Learn", path: "/learn" }]),
  );
}

export function articleSchema(opts: {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  dateModified?: string;
}) {
  return graph(
    {
      "@type": "Article",
      headline: opts.title,
      description: opts.description,
      datePublished: opts.datePublished,
      dateModified: opts.dateModified || opts.datePublished,
      author: siteOrg,
      publisher: siteOrg,
      mainEntityOfPage: `${SITE_URL}/learn/${opts.slug}`,
    },
    breadcrumbList([
      { name: "Learn", path: "/learn" },
      { name: opts.title, path: `/learn/${opts.slug}` },
    ]),
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
