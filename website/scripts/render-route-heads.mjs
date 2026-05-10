#!/usr/bin/env node
// Post-build SEO splicer (OSS_SPEC §11.3).
//
// React Router renders routes client-side, so the production HTML emitted by
// Vite has the same generic <head> on every URL. Generic crawlers (and all
// social-card scrapers) snapshot the static HTML before any JS runs. This
// script walks every public route, copies dist/index.html into the route's
// path, and rewrites <head> with route-specific title, description,
// canonical, Open Graph, Twitter Card, and JSON-LD.
//
// It also regenerates dist/sitemap.xml from the same route list and writes
// dist/404.html as an SPA fallback (a copy of the homepage with its head).
//
// Source of truth: ../src/seo/siteConfig.ts. We import it as plain JSON-ish
// data via a regex parser so this script needs no transpilation.

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
// Pull config straight from the TS file. We need just three things — site
// metadata, the route list, and the current package version — so a regex
// extractor avoids the cost of a TS toolchain in this build step.
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

const SITE_NAME = pickString("name");
const SITE_URL = pickString("siteUrl").replace(/\/$/, "");
const SITE_LOCALE = pickString("locale");
const REPO_URL = pickString("repoUrl");
const OG_IMAGE_PATH = (() => {
  const m = siteConfigSrc.match(/path:\s*"(\/[^"]+)"/);
  if (!m) throw new Error("could not find ogImage.path");
  return m[1];
})();

// Routes — parse the `routes` array. We only need path/title/description/
// schemaType per entry.
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
      // siteConfig references `siteConfig.description` for the homepage —
      // pull that string instead.
      const sd = siteConfigSrc.match(/description:\s*\n?\s*"([^"]+)"/);
      description = sd?.[1];
    }
    const schemaType =
      block.match(/schemaType:\s*"([^"]+)"/)?.[1] ?? "WebPage";
    if (path && title && description) {
      routes.push({ path, title, description, schemaType });
    }
  }
  return routes;
}

const ROUTES = extractRoutes();
if (ROUTES.length === 0) throw new Error("extracted 0 routes");

// Pull version from Cargo.toml so the JSON-LD `softwareVersion` stays in sync.
function extractVersion() {
  const cargo = readFileSync(join(repoRoot, "Cargo.toml"), "utf-8");
  const m = cargo.match(/^\s*version\s*=\s*"([^"]+)"/m);
  if (!m) throw new Error("could not parse Cargo.toml version");
  return m[1];
}
const VERSION = extractVersion();

// Last-modified (HEAD's commit timestamp) — used for sitemap.xml.
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
const LASTMOD = lastMod();

// ---------------------------------------------------------------------------
// HTML splicing
// ---------------------------------------------------------------------------

const baseHtml = readFileSync(join(dist, "index.html"), "utf-8");

function buildHead(route) {
  const absolute = `${SITE_URL}${route.path === "/" ? "/" : route.path}`;
  const ogImage = `${SITE_URL}${OG_IMAGE_PATH}`;
  const ogImageAlt = `${SITE_NAME} — ${route.title.replace(/^.*?— /, "")}`;

  const ldJson = (() => {
    const common = {
      "@context": "https://schema.org",
      "@type": route.schemaType,
      "@id": `${absolute}#${route.schemaType.toLowerCase()}`,
      name: route.title,
      description: route.description,
      url: absolute,
      image: ogImage,
      inLanguage: SITE_LOCALE.replace("_", "-"),
    };
    if (route.schemaType === "SoftwareApplication") {
      Object.assign(common, {
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Linux, macOS, Windows",
        programmingLanguage: "Rust",
        softwareVersion: VERSION,
        license: "https://opensource.org/licenses/MIT",
        codeRepository: REPO_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      });
    }
    return JSON.stringify(common, null, 2);
  })();

  return `<title>${escapeHtml(route.title)}</title>
    <meta name="description" content="${escapeAttr(route.description)}" />
    <link rel="canonical" href="${absolute}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <link rel="sitemap" type="application/xml" href="/sitemap.xml" />

    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeAttr(route.title)}" />
    <meta property="og:description" content="${escapeAttr(route.description)}" />
    <meta property="og:url" content="${absolute}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeAttr(ogImageAlt)}" />
    <meta property="og:locale" content="${SITE_LOCALE}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(route.title)}" />
    <meta name="twitter:description" content="${escapeAttr(route.description)}" />
    <meta name="twitter:image" content="${ogImage}" />

    <script type="application/ld+json">
${ldJson}
    </script>`;
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
for (const route of ROUTES) {
  const head = buildHead(route);
  const html = splice(baseHtml, head);

  const outDir = route.path === "/" ? dist : join(dist, route.path.replace(/^\//, ""));
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

const sitemapEntries = ROUTES.map((r) => {
  const loc = `${SITE_URL}${r.path === "/" ? "/" : r.path + "/"}`;
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${r.path === "/" ? "1.0" : "0.8"}</priority>
  </url>`;
}).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`;
writeFileSync(join(dist, "sitemap.xml"), sitemap, "utf-8");

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
writeFileSync(join(dist, "robots.txt"), robots, "utf-8");

console.log(`[seo] prerendered ${written} route(s):`);
for (const r of ROUTES) console.log(`[seo]   ${r.path}  →  ${r.title}`);
console.log(`[seo] regenerated sitemap.xml (${ROUTES.length} entries, lastmod ${LASTMOD})`);
console.log(`[seo] regenerated robots.txt`);
console.log(`[seo] wrote 404.html (SPA fallback)`);
