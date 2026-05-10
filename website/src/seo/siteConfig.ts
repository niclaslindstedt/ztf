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
  schemaType: "SoftwareApplication" | "TechArticle" | "CollectionPage";
}

export const siteConfig = {
  name: "ztf",
  tagline: "Agent-assisted end-to-end testing for CLIs",
  description:
    "ztf is a Rust CLI that runs agent-assisted end-to-end tests defined in TOML scenario files, with arrange/act/assert stages and an AI-powered final verdict.",
  siteUrl: "https://ztf.niclaslindstedt.se/",
  repoUrl: "https://github.com/niclaslindstedt/ztf",
  cratesUrl: "https://crates.io/crates/ztf",
  locale: "en_US",
  language: "en",
  ogImage: {
    path: "/og-default.png",
    width: 1200,
    height: 630,
    alt: "ztf — agent-assisted end-to-end testing",
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
    title: "ztf — agent-assisted end-to-end testing",
    description: siteConfig.description,
    schemaType: "SoftwareApplication",
  },
  {
    path: "/docs",
    title: "Documentation — ztf",
    description:
      "Hosted reference for ztf: getting started, configuration, architecture, and troubleshooting.",
    schemaType: "CollectionPage",
  },
  {
    path: "/manual",
    title: "Manual — ztf",
    description:
      "Embedded manpages for every ztf command, mirrored from the binary's --man output.",
    schemaType: "CollectionPage",
  },
];

export function absoluteUrl(pathname: string): string {
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const suffix = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${suffix}`;
}
