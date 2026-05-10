// Single source of truth for SEO copy and configuration (§11.3).
// Imported by the website's runtime <head> and any build-time
// generators (sitemap.xml, robots.txt, JSON-LD). Tweaking the
// project's pitch must be a one-file change.

export const siteConfig = {
  name: "ztf",
  tagline: "Agent-assisted end-to-end testing for Rust CLIs",
  description:
    "ztf is a Rust CLI that runs agent-assisted end-to-end tests defined in TOML scenario files, with arrange/act/assert stages and an AI-powered final verdict.",
  siteUrl: "https://niclaslindstedt.github.io/ztf/",
  locale: "en_US",
  language: "en",
  ogImage: {
    path: "/og-default.png",
    width: 1200,
    height: 630,
    alt: "ztf — agent-assisted end-to-end testing",
  },
  twitter: {
    card: "summary_large_image",
  },
  feeds: {
    sitemap: "/sitemap.xml",
    robots: "/robots.txt",
  },
  schemaType: "SoftwareApplication",
};

export const routes = [
  {
    path: "/",
    title: "ztf — agent-assisted end-to-end testing",
    description: siteConfig.description,
  },
];

export function absoluteUrl(pathname) {
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const suffix = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${suffix}`;
}
