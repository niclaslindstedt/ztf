// Single source of truth for SEO copy and configuration (OSS_SPEC §11.3).
// Imported by both runtime React code (per-route titles, JSON-LD) and the
// build-time `render-route-heads.mjs` generator that splices route-specific
// <head> blocks into dist/<route>/index.html.
//
// Tweaking the project's pitch must be a one-file change.

export interface OgImage {
  path: string;
  width: number;
  height: number;
  alt: string;
}

export interface RouteMeta {
  path: string;
  title: string;
  description: string;
  /** schema.org type for the route's JSON-LD block. */
  schemaType:
    | "SoftwareApplication"
    | "TechArticle"
    | "CollectionPage"
    | "WebPage";
}

export const siteConfig = {
  name: "ztf",
  tagline: "Agent-assisted end-to-end testing for CLIs",
  description:
    "ztf is a Rust CLI that runs agent-assisted end-to-end tests defined in TOML scenario files. Author arrange/act/assert stages, get a structured AI verdict as the final gate, and a single CI exit code.",
  // Search-engine keywords. Aimed at programmers looking for ways to test
  // CLIs, shell tools, and LLM-driven workflows where a regex assertion is
  // not enough. Order matters — search engines weight the first few more.
  keywords: [
    "end-to-end testing",
    "CLI testing",
    "Rust CLI",
    "TOML test scenarios",
    "AI testing",
    "agent-assisted testing",
    "LLM testing",
    "arrange act assert",
    "shell testing",
    "integration testing",
    "snapshot testing alternative",
    "ztf",
    "zag agent",
    "test harness",
    "developer tools",
  ],
  siteUrl: "https://ztf.niclaslindstedt.se/",
  repoUrl: "https://github.com/niclaslindstedt/ztf",
  cratesUrl: "https://crates.io/crates/ztf",
  docsUrl: "https://ztf.niclaslindstedt.se/docs",
  locale: "en_US",
  language: "en",
  themeColor: "#f7b500",
  author: {
    name: "Niclas Lindstedt",
    url: "https://github.com/niclaslindstedt",
  },
  publisher: {
    name: "Niclas Lindstedt",
    url: "https://niclaslindstedt.se",
  },
  ogImage: {
    path: "/og-default.png",
    width: 1200,
    height: 630,
    alt: "ztf — agent-assisted end-to-end testing for CLIs",
  } satisfies OgImage,
  twitter: {
    card: "summary_large_image",
  },
  feeds: {
    sitemap: "/sitemap.xml",
    robots: "/robots.txt",
  },
} as const;

export const routes: RouteMeta[] = [
  {
    path: "/",
    title: "ztf — agent-assisted end-to-end testing for CLIs",
    description: siteConfig.description,
    schemaType: "SoftwareApplication",
  },
  {
    path: "/docs",
    title: "Documentation — ztf, a Rust CLI for end-to-end testing",
    description:
      "Hosted reference for ztf: getting started, configuration of TOML scenarios, architecture, and troubleshooting for the agent-assisted end-to-end test runner.",
    schemaType: "CollectionPage",
  },
  {
    path: "/manual",
    title: "Manual — ztf command reference",
    description:
      "Embedded manpages for every ztf command — run, commands, man, docs — mirrored from the binary's --man output and kept in lockstep with the source.",
    schemaType: "CollectionPage",
  },
];

export function absoluteUrl(pathname: string): string {
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const suffix = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${suffix}`;
}
