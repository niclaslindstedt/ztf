#!/usr/bin/env node
// Post-build SEO splicer (OSS_SPEC §11.3).
//
// React Router renders routes client-side, so the production HTML emitted by
// Vite has the same generic <head> on every URL. Generic crawlers (and all
// social-card scrapers) snapshot the static HTML before any JS runs. This
// script walks every public route — including every doc and manpage
// subroute — copies dist/index.html into the route's path, and rewrites
// <head> with route-specific title, description, canonical, Open Graph,
// Twitter Card, JSON-LD (SoftwareApplication / TechArticle / BreadcrumbList /
// CollectionPage), and a per-page lastmod-aware sitemap.
//
// It also regenerates dist/sitemap.xml and dist/robots.txt from the same
// route list and writes dist/404.html as an SPA fallback.
//
// Sources of truth:
//   - ../src/seo/siteConfig.ts   (site-wide SEO copy + static routes)
//   - ../src/generated/seoData.json   (per-doc + per-manpage descriptions,
//     emitted by extract-source-data.mjs)
//
// All "facts" about the project — version, doc titles, descriptions,
// last-modified — flow from source. Nothing here is hand-maintained.

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(__dirname, "..");
const dist = join(websiteRoot, "dist");
const repoRoot = resolve(websiteRoot, "..");

if (!existsSync(join(dist, "index.html"))) {
  console.error("[seo] dist/index.html missing — run `vite build` first");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Pull config straight from siteConfig.ts (a regex extractor avoids pulling
// in a TS toolchain just for this build step). Per-doc / per-manpage SEO
// metadata comes from the JSON sidecar emitted by extract-source-data.mjs.
// ---------------------------------------------------------------------------

const siteConfigSrc = readFileSync(
  join(websiteRoot, "src", "seo", "siteConfig.ts"),
  "utf-8",
);

function pickString(name) {
  const re = new RegExp(`${name}:\\s*"([^"]+)"`);
  const m = siteConfigSrc.match(re);
  if (!m) throw new Error(`could not find ${name} in siteConfig.ts`);
  return m[1];
}

function pickStringArray(name) {
  const re = new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`);
  const m = siteConfigSrc.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const SITE_NAME = pickString("name");
const SITE_TAGLINE = pickString("tagline");
const SITE_DESCRIPTION = (() => {
  const m = siteConfigSrc.match(/description:\s*\n?\s*"([^"]+)"/);
  if (!m) throw new Error("could not find siteConfig.description");
  return m[1];
})();
const SITE_URL = pickString("siteUrl").replace(/\/$/, "");
const SITE_LOCALE = pickString("locale");
const SITE_LANG = pickString("language");
const THEME_COLOR = (() => {
  const m = siteConfigSrc.match(/themeColor:\s*"([^"]+)"/);
  return m ? m[1] : "#f7b500";
})();
const REPO_URL = pickString("repoUrl");
const KEYWORDS = pickStringArray("keywords");
const OG_IMAGE_PATH = (() => {
  const m = siteConfigSrc.match(/path:\s*"(\/[^"]+)"/);
  if (!m) throw new Error("could not find ogImage.path");
  return m[1];
})();

function pickAuthor() {
  const m = siteConfigSrc.match(/author:\s*\{([\s\S]*?)\}/);
  if (!m) return { name: SITE_NAME, url: REPO_URL };
  const block = m[1];
  return {
    name: block.match(/name:\s*"([^"]+)"/)?.[1] ?? SITE_NAME,
    url: block.match(/url:\s*"([^"]+)"/)?.[1] ?? REPO_URL,
  };
}
const AUTHOR = pickAuthor();

// Static routes (homepage, /docs, /manual indexes).
function extractRoutes() {
  const m = siteConfigSrc.match(/routes:\s*RouteMeta\[\]\s*=\s*\[([\s\S]*?)\];/);
  if (!m) throw new Error("could not find routes array in siteConfig.ts");
  const body = m[1];
  const routes = [];
  const itemRe = /\{([\s\S]*?)\}/g;
  let r;
  while ((r = itemRe.exec(body)) !== null) {
    const block = r[1];
    const path = block.match(/path:\s*"([^"]+)"/)?.[1];
    const title = block.match(/title:\s*"([^"]+)"/)?.[1];
    let description = block.match(/description:\s*"([^"]+)"/)?.[1];
    if (!description) {
      description = SITE_DESCRIPTION;
    }
    const schemaType =
      block.match(/schemaType:\s*"([^"]+)"/)?.[1] ?? "WebPage";
    if (path && title) {
      routes.push({ path, title, description, schemaType, kind: "static" });
    }
  }
  return routes;
}

const STATIC_ROUTES = extractRoutes();
if (STATIC_ROUTES.length === 0) throw new Error("extracted 0 routes");

// Per-doc / per-manpage routes — pulled from the JSON sidecar emitted by
// extract-source-data.mjs. Each subroute gets its own prerendered <head>.
const seoSidecarPath = join(websiteRoot, "src", "generated", "seoData.json");
if (!existsSync(seoSidecarPath)) {
  throw new Error(
    `${seoSidecarPath} missing — run \`npm run extract\` before this script`,
  );
}
const SEO_DATA = JSON.parse(readFileSync(seoSidecarPath, "utf-8"));

const DOC_ROUTES = SEO_DATA.docs.map((d) => ({
  path: `/docs/${d.slug}`,
  title: `${d.title} — ztf docs`,
  description: d.description,
  schemaType: "TechArticle",
  kind: "doc",
  slug: d.slug,
  lastmod: d.lastmod,
  parent: { name: "Documentation", path: "/docs" },
}));

const MAN_ROUTES = SEO_DATA.manpages.map((m) => ({
  path: `/manual/${m.slug}`,
  title: `${m.title}(1) — ztf manual page`,
  description: m.description,
  schemaType: "TechArticle",
  kind: "manpage",
  slug: m.slug,
  lastmod: m.lastmod,
  parent: { name: "Manual", path: "/manual" },
}));

// Static index routes get a sensible "kind" too so the sitemap can prioritise.
for (const r of STATIC_ROUTES) {
  if (r.path === "/") r.kind = "home";
  else if (r.path === "/docs") r.kind = "docs-index";
  else if (r.path === "/manual") r.kind = "manual-index";
}

const ALL_ROUTES = [...STATIC_ROUTES, ...DOC_ROUTES, ...MAN_ROUTES];

// Pull version from Cargo.toml so the JSON-LD `softwareVersion` stays in sync.
function extractVersion() {
  const cargo = readFileSync(join(repoRoot, "Cargo.toml"), "utf-8");
  const m = cargo.match(/^\s*version\s*=\s*"([^"]+)"/m);
  if (!m) throw new Error("could not parse Cargo.toml version");
  return m[1];
}
const VERSION = extractVersion();

// Last-modified (HEAD's commit timestamp) — used as fallback when a route
// has no per-file lastmod.
function lastMod() {
  try {
    return execSync("git log -1 --format=%cI", {
      cwd: repoRoot,
      encoding: "utf-8",
    })
      .trim()
      .slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
const HEAD_LASTMOD = lastMod();

function routeLastmod(route) {
  return route.lastmod || HEAD_LASTMOD;
}

// ---------------------------------------------------------------------------
// HTML splicing
// ---------------------------------------------------------------------------

const baseHtml = readFileSync(join(dist, "index.html"), "utf-8");

function buildHead(route) {
  const absolute = `${SITE_URL}${route.path === "/" ? "/" : route.path}`;
  const ogImage = `${SITE_URL}${OG_IMAGE_PATH}`;
  const ogImageAlt = `${SITE_NAME} — ${route.title.replace(/^.*?— /, "")}`;
  const keywordsAttr = KEYWORDS.join(", ");

  const ldBlocks = [];

  // Primary block — type per route.
  const primary = {
    "@context": "https://schema.org",
    "@type": route.schemaType,
    "@id": `${absolute}#${route.schemaType.toLowerCase()}`,
    name: route.title,
    headline: route.title,
    description: route.description,
    url: absolute,
    image: ogImage,
    inLanguage: SITE_LOCALE.replace("_", "-"),
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
    },
    author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
    publisher: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
    keywords: KEYWORDS.join(", "),
  };

  if (route.schemaType === "SoftwareApplication") {
    Object.assign(primary, {
      applicationCategory: "DeveloperApplication",
      applicationSubCategory: "Testing",
      operatingSystem: "Linux, macOS, Windows",
      programmingLanguage: "Rust",
      softwareVersion: VERSION,
      license: "https://opensource.org/licenses/MIT",
      codeRepository: REPO_URL,
      downloadUrl: "https://crates.io/crates/ztf",
      installUrl: "https://crates.io/crates/ztf",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
  }

  if (route.schemaType === "TechArticle") {
    primary.articleSection =
      route.kind === "doc" ? "Documentation" : "Manual";
    primary.proficiencyLevel = "Beginner";
    primary.dependencies = "ztf CLI, Rust toolchain";
    primary.dateModified = routeLastmod(route);
  }

  ldBlocks.push(primary);

  // Breadcrumbs — only meaningful for nested pages.
  if (route.parent) {
    ldBlocks.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: route.parent.name,
          item: `${SITE_URL}${route.parent.path}`,
        },
        { "@type": "ListItem", position: 3, name: route.title, item: absolute },
      ],
    });
  }

  // On the homepage, attach a SoftwareSourceCode companion plus a WebSite
  // node carrying SearchAction so Google can render a sitelinks search box.
  if (route.path === "/") {
    ldBlocks.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: SITE_TAGLINE,
      description: SITE_DESCRIPTION,
      inLanguage: SITE_LOCALE.replace("_", "-"),
      publisher: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
    });
    ldBlocks.push({
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      "@id": `${SITE_URL}/#sourcecode`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      codeRepository: REPO_URL,
      programmingLanguage: "Rust",
      runtimePlatform: "Linux, macOS, Windows",
      license: "https://opensource.org/licenses/MIT",
      author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
      url: `${SITE_URL}/`,
      keywords: KEYWORDS.join(", "),
    });
  }

  const jsonLd = ldBlocks
    .map(
      (b) =>
        `<script type="application/ld+json">\n${JSON.stringify(b, null, 2)}\n    </script>`,
    )
    .join("\n    ");

  return `<title>${escapeHtml(route.title)}</title>
    <meta name="description" content="${escapeAttr(route.description)}" />
    <meta name="keywords" content="${escapeAttr(keywordsAttr)}" />
    <meta name="author" content="${escapeAttr(AUTHOR.name)}" />
    <meta name="theme-color" content="${escapeAttr(THEME_COLOR)}" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta name="generator" content="${escapeAttr(`${SITE_NAME} v${VERSION}`)}" />
    <link rel="canonical" href="${absolute}" />
    <link rel="author" href="${escapeAttr(AUTHOR.url)}" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1" />
    <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
    <link rel="alternate" type="application/xml" href="/sitemap.xml" title="Sitemap" />

    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeAttr(route.title)}" />
    <meta property="og:description" content="${escapeAttr(route.description)}" />
    <meta property="og:url" content="${absolute}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:secure_url" content="${ogImage}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeAttr(ogImageAlt)}" />
    <meta property="og:locale" content="${SITE_LOCALE}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(route.title)}" />
    <meta name="twitter:description" content="${escapeAttr(route.description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="${escapeAttr(ogImageAlt)}" />

    ${jsonLd}`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

// Replace everything from <title>…</title> through the closing </script> of
// the existing JSON-LD block with our route-specific block. The favicon /
// viewport / charset above and the body root below are preserved verbatim.
//
// Vite injects bundled asset tags (<script type="module" src="/assets/…">
// and <link rel="stylesheet" href="/assets/…">) into the <head>; without
// preserving them the page renders blank because the JS bundle never loads.
function splice(html, headBlock) {
  const headEnd = html.indexOf("</head>");
  if (headEnd === -1) throw new Error("no </head> in dist/index.html");
  const titleStart = html.indexOf("<title>");
  if (titleStart === -1) throw new Error("no <title> in dist/index.html");
  const headInner = html.slice(titleStart, headEnd);
  const assetTags = [
    ...headInner.matchAll(
      /<script\b[^>]*\bsrc=["'][^"']*["'][^>]*>\s*<\/script>/gi,
    ),
    ...headInner.matchAll(
      /<link\b[^>]*\brel=["'](?:stylesheet|modulepreload|preload)["'][^>]*\/?>/gi,
    ),
  ]
    .map((m) => m[0])
    .join("\n    ");
  const preserved = assetTags ? `\n    ${assetTags}\n  ` : "\n  ";
  return html.slice(0, titleStart) + headBlock + preserved + html.slice(headEnd);
}

// ---------------------------------------------------------------------------
// Write each route into dist/<path>/index.html
// ---------------------------------------------------------------------------

let written = 0;
for (const route of ALL_ROUTES) {
  const head = buildHead(route);
  const html = splice(baseHtml, head);

  const outDir =
    route.path === "/" ? dist : join(dist, route.path.replace(/^\//, ""));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf-8");
  written++;
}

// SPA fallback for unknown URLs (GitHub Pages serves dist/404.html when no
// matching file exists) — use the homepage's prerendered HTML.
copyFileSync(join(dist, "index.html"), join(dist, "404.html"));

// ---------------------------------------------------------------------------
// Sitemap + robots.txt — regenerated from the same data.
// ---------------------------------------------------------------------------

function priorityFor(route) {
  switch (route.kind) {
    case "home":
      return "1.0";
    case "docs-index":
    case "manual-index":
      return "0.9";
    case "doc":
      return "0.8";
    case "manpage":
      return "0.7";
    default:
      return "0.5";
  }
}

function changefreqFor(route) {
  switch (route.kind) {
    case "home":
      return "weekly";
    case "docs-index":
    case "manual-index":
      return "weekly";
    case "doc":
    case "manpage":
      return "monthly";
    default:
      return "monthly";
  }
}

const sitemapEntries = ALL_ROUTES.map((r) => {
  const loc = `${SITE_URL}${r.path === "/" ? "/" : r.path + "/"}`;
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${routeLastmod(r)}</lastmod>
    <changefreq>${changefreqFor(r)}</changefreq>
    <priority>${priorityFor(r)}</priority>
  </url>`;
}).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`;
writeFileSync(join(dist, "sitemap.xml"), sitemap, "utf-8");

// robots.txt — explicit allow + Sitemap (absolute URL per OSS_SPEC §11.3).
// Block known low-value crawlers? No — we want maximum discoverability.
const robots = `User-agent: *
Allow: /

# AI crawlers — explicitly permitted; ztf is open source and indexable.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
Host: ${SITE_URL.replace(/^https?:\/\//, "")}
`;
writeFileSync(join(dist, "robots.txt"), robots, "utf-8");

// security.txt — RFC 9116. Helps researchers and crawlers locate disclosure
// info; also a small positive signal for site quality / trustworthiness.
const securityTxt = `Contact: ${REPO_URL}/security/advisories/new
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10)}T00:00:00.000Z
Preferred-Languages: ${SITE_LANG}
Canonical: ${SITE_URL}/.well-known/security.txt
`;
const wellKnown = join(dist, ".well-known");
mkdirSync(wellKnown, { recursive: true });
writeFileSync(join(wellKnown, "security.txt"), securityTxt, "utf-8");
// Also expose at /security.txt for clients that don't probe .well-known.
writeFileSync(join(dist, "security.txt"), securityTxt, "utf-8");

// humans.txt — soft signal for credit / authorship discoverability.
const humansTxt = `/* TEAM */
  Author: ${AUTHOR.name}
  Site: ${AUTHOR.url}

/* SITE */
  Last update: ${HEAD_LASTMOD}
  Language: ${SITE_LANG}
  Doctype: HTML5
  Components: React, Vite, Tailwind, React Router
  Software: ${SITE_NAME} v${VERSION}
`;
writeFileSync(join(dist, "humans.txt"), humansTxt, "utf-8");

// ---------------------------------------------------------------------------
// CI verification — fail loudly if any required SEO output is missing.
// (Spec §11.3: "The website build job must fail if any required SEO output
// is missing — sitemap.xml, robots.txt, the homepage's JSON-LD, and per-route
// <title> plus canonical link.")
// ---------------------------------------------------------------------------

function assertContains(file, needle, label) {
  const path = join(dist, file);
  if (!existsSync(path)) {
    console.error(`[seo] FAIL: ${file} missing`);
    process.exit(1);
  }
  const body = readFileSync(path, "utf-8");
  if (!body.includes(needle)) {
    console.error(`[seo] FAIL: ${file} missing ${label}`);
    process.exit(1);
  }
}

assertContains("sitemap.xml", "<urlset", "<urlset>");
assertContains("robots.txt", "Sitemap:", "Sitemap: line");
assertContains("index.html", "application/ld+json", "homepage JSON-LD");
for (const r of ALL_ROUTES) {
  const f = r.path === "/" ? "index.html" : `${r.path.replace(/^\//, "")}/index.html`;
  assertContains(f, "<title>", `${r.path} <title>`);
  assertContains(f, 'rel="canonical"', `${r.path} canonical`);
  assertContains(f, "application/ld+json", `${r.path} JSON-LD`);
}

console.log(`[seo] prerendered ${written} route(s):`);
for (const r of ALL_ROUTES)
  console.log(`[seo]   ${r.path.padEnd(28)}  →  ${r.title}`);
console.log(`[seo] regenerated sitemap.xml (${ALL_ROUTES.length} entries)`);
console.log(`[seo] regenerated robots.txt`);
console.log(`[seo] wrote 404.html, security.txt, humans.txt`);
