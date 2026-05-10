#!/usr/bin/env node
// Extract structured data from the ztf source tree and emit a typed
// `src/generated/sourceData.ts`. The website never hard-codes anything that
// already lives in source — every fact below comes from the codebase.
//
// Run from the website/ directory:    node scripts/extract-source-data.mjs
// Or via the package script:           npm run extract
//
// Per OSS_SPEC §11.2, this is the first step of the website build, and any
// missing source marker must fail loudly rather than silently emit stale
// data. When a `v*` tag exists we read source files at that tag so the
// deployed site reflects the latest *released* version.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

let LATEST_TAG = "";
try {
  LATEST_TAG = execSync("git tag -l 'v*' --sort=-version:refname", {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  })
    .split("\n")
    .filter(Boolean)[0] || "";
} catch {
  // not a git repo — fall back to working tree
}

function read(relPath) {
  if (LATEST_TAG) {
    try {
      return execSync(`git show ${LATEST_TAG}:${relPath}`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      // file may not exist at the tag (newly added) — fall through
    }
  }
  return readFileSync(join(REPO_ROOT, relPath), "utf-8");
}

function bail(msg) {
  console.error(`[extract] ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Version (Cargo.toml [package].version)
// ---------------------------------------------------------------------------

function extractVersion() {
  const cargo = read("Cargo.toml");
  const m = cargo.match(/^\s*version\s*=\s*"([^"]+)"/m);
  if (!m) bail("could not parse [package].version from Cargo.toml");
  return m[1];
}

// ---------------------------------------------------------------------------
// Last updated (git ISO timestamp of HEAD)
// ---------------------------------------------------------------------------

function extractLastUpdated() {
  try {
    const iso = execSync("git log -1 --format=%cI", {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return iso || new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ---------------------------------------------------------------------------
// Example scenario (examples/greet/ztf.toml — the canonical demo)
// ---------------------------------------------------------------------------

function extractExampleScenario() {
  return read("examples/greet/ztf.toml").trimEnd();
}

// ---------------------------------------------------------------------------
// CLI commands and flags (src/cli.rs)
// ---------------------------------------------------------------------------

function stripDocComment(block) {
  // Convert a contiguous run of `/// …` lines into a single string. We drop
  // §-references (a spec citation, irrelevant to the website) and clean up
  // the dangling "See" / trailing punctuation they leave behind.
  return block
    .split("\n")
    .map((l) => l.replace(/^\s*\/\/\/\s?/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s*See\s+§\d+(?:\.\d+)*\.?\s*/g, " ")
    .replace(/\s*§\d+(?:\.\d+)*\.?\s*/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCommands() {
  const src = read("src/cli.rs");

  // pub enum Command { … }
  const enumMatch = src.match(/pub enum Command\s*\{([\s\S]*?)\n\}/);
  if (!enumMatch) bail("could not find `pub enum Command` in src/cli.rs");
  const body = enumMatch[1];

  // Match `/// …` doc comments followed by `Variant {` or `Variant,`.
  const variantRe =
    /((?:[ \t]*\/\/\/[^\n]*\n)+)\s*([A-Z][A-Za-z0-9]*)\s*[\{,]/g;
  const commands = [];
  let m;
  while ((m = variantRe.exec(body)) !== null) {
    const description = stripDocComment(m[1]);
    const name = m[2].toLowerCase();
    commands.push({ name, description });
  }
  if (commands.length === 0) bail("no Command variants extracted from cli.rs");
  return commands;
}

function extractGlobalFlags() {
  const src = read("src/cli.rs");

  // Match doc-commented `#[arg(long, …)] pub <name>: <type>` inside the Cli struct.
  const cliMatch = src.match(/pub struct Cli\s*\{([\s\S]*?)\n\}/);
  if (!cliMatch) bail("could not find `pub struct Cli` in src/cli.rs");
  const body = cliMatch[1];

  const flagRe =
    /((?:[ \t]*\/\/\/[^\n]*\n)+)\s*#\[arg\(([^\]]*)\)\]\s*pub\s+(\w+)\s*:\s*([^,\n]+)/g;
  const flags = [];
  let m;
  while ((m = flagRe.exec(body)) !== null) {
    const description = stripDocComment(m[1]);
    const argSpec = m[2];
    const fieldName = m[3];
    const ty = m[4].trim().replace(/,$/, "");

    // Only top-level flags (long names) — every Cli flag uses `long`.
    if (!argSpec.includes("long")) continue;
    const flagName = fieldName.replace(/_/g, "-");

    flags.push({
      name: `--${flagName}`,
      type: ty.includes("bool") ? "bool" : ty,
      description,
    });
  }
  return flags;
}

// ---------------------------------------------------------------------------
// Assertion kinds (src/config.rs `pub struct Assert { … }`)
// ---------------------------------------------------------------------------

function extractAssertions() {
  const manSrc = read("man/main.md");
  // The manpage's "## Assertions" table is the authoritative agent-readable
  // surface (see CLAUDE.md: every assertion lives there). Parse rows.
  const section = manSrc.match(/##\s*Assertions[\s\S]*?\n\n([\s\S]*?)\n\n/);
  if (!section) bail("could not find ## Assertions section in man/main.md");
  const rows = section[1]
    .split("\n")
    .filter((l) => l.startsWith("|") && !l.startsWith("|---") && !l.startsWith("| Key"));

  const cells = (line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

  const assertions = rows.map((row) => {
    const [key, type, meaning] = cells(row);
    return { key: key.replace(/`/g, ""), type: type.replace(/`/g, ""), meaning };
  });

  // Cross-check against src/config.rs to ensure we didn't drift.
  const cfg = read("src/config.rs");
  const assertBlock = cfg.match(/pub struct Assert\s*\{([\s\S]*?)\n\}/);
  if (!assertBlock) bail("could not find `pub struct Assert` in src/config.rs");
  for (const a of assertions) {
    if (!new RegExp(`pub\\s+${a.key}\\s*:`).test(assertBlock[1])) {
      bail(
        `manpage assertion '${a.key}' not present in src/config.rs Assert struct`,
      );
    }
  }
  return assertions;
}

// ---------------------------------------------------------------------------
// Stages (the four scenario blocks)
// ---------------------------------------------------------------------------

function extractStages() {
  // Stage names are load-bearing — verify they exist as structs in config.rs.
  const cfg = read("src/config.rs");
  const required = ["Setup", "Teardown", "Arrange", "Act", "Assert", "AgentReview"];
  for (const name of required) {
    if (!new RegExp(`pub struct ${name}\\b`).test(cfg)) {
      bail(`expected struct ${name} not found in src/config.rs`);
    }
  }
  // The four per-scenario blocks the website surfaces.
  return [
    {
      key: "arrange",
      title: "arrange",
      description:
        "Setup commands that prepare state inside the per-file temp directory.",
    },
    {
      key: "act",
      title: "act",
      description:
        "The single command under test. stdout, stderr, and exit code are captured.",
    },
    {
      key: "assert",
      title: "assert",
      description:
        "Programmatic checks against stdout, stderr, exit code, and the filesystem.",
    },
    {
      key: "agent_review",
      title: "agent_review",
      description:
        "Optional natural-language verdict from a zag-driven AI reviewer — runs only when every programmatic assertion passes.",
    },
  ];
}

// ---------------------------------------------------------------------------
// Hosted docs (docs/*.md)
// ---------------------------------------------------------------------------

const DOC_TITLES = {
  "getting-started": "Getting started",
  configuration: "Configuration",
  architecture: "Architecture",
  troubleshooting: "Troubleshooting",
};

const DOC_ORDER = ["getting-started", "configuration", "architecture", "troubleshooting"];

function extractDocs() {
  const docsDir = "docs";
  const files = LATEST_TAG
    ? execSync(`git ls-tree --name-only ${LATEST_TAG} ${docsDir}/`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
      })
        .split("\n")
        .filter(Boolean)
        .map((p) => p.replace(/^docs\//, ""))
    : readdirSync(join(REPO_ROOT, docsDir));

  const md = files.filter((f) => f.endsWith(".md"));
  const slugs = md.map((f) => f.replace(/\.md$/, ""));

  for (const slug of DOC_ORDER) {
    if (!slugs.includes(slug)) bail(`expected docs/${slug}.md to exist`);
  }

  const ordered = [
    ...DOC_ORDER,
    ...slugs.filter((s) => !DOC_ORDER.includes(s)),
  ];

  return ordered.map((slug) => ({
    slug,
    title: DOC_TITLES[slug] || titleFromMd(read(`docs/${slug}.md`)) || slug,
    content: read(`docs/${slug}.md`),
  }));
}

function titleFromMd(src) {
  const m = src.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

// ---------------------------------------------------------------------------
// Manpages (man/*.md)
// ---------------------------------------------------------------------------

const MAN_ORDER = ["main", "run", "commands", "man", "docs"];

function extractManpages() {
  const files = LATEST_TAG
    ? execSync(`git ls-tree --name-only ${LATEST_TAG} man/`, {
        cwd: REPO_ROOT,
        encoding: "utf-8",
      })
        .split("\n")
        .filter(Boolean)
        .map((p) => p.replace(/^man\//, ""))
    : readdirSync(join(REPO_ROOT, "man"));

  const md = files.filter((f) => f.endsWith(".md"));
  const slugs = md.map((f) => f.replace(/\.md$/, ""));

  if (!slugs.includes("main")) bail("expected man/main.md to exist");

  const ordered = [
    ...MAN_ORDER.filter((s) => slugs.includes(s)),
    ...slugs.filter((s) => !MAN_ORDER.includes(s)),
  ];

  return ordered.map((slug) => {
    const content = read(`man/${slug}.md`);
    return {
      slug,
      title: slug === "main" ? "ztf" : `ztf ${slug}`,
      content,
    };
  });
}

// ---------------------------------------------------------------------------
// Generate output (src/generated/sourceData.ts)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// SEO descriptions per doc / manpage. We pull the H1's trailing blockquote
// (the one-line synopsis convention every doc/manpage in this repo uses) and
// fall back to the first non-heading paragraph. This keeps per-route
// <meta name="description"> in lockstep with the source instead of being
// hand-maintained.
// ---------------------------------------------------------------------------

function extractSeoDescription(md, fallback) {
  // Drop the top H1 line, then walk paragraphs.
  const body = md.replace(/^#\s+.+\n/, "");
  const blockquote = body.match(/^>\s+(.+(?:\n>\s+.+)*)/m);
  let candidate = "";
  if (blockquote) {
    candidate = blockquote[1]
      .replace(/\n>\s+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } else {
    const para = body.match(/^(?!#|>|```|\||\s*[-*]|\s*\d+\.)([^\n]+(?:\n(?!\s*\n)[^\n]+)*)/m);
    if (para) {
      candidate = para[1].replace(/\s+/g, " ").trim().slice(0, 240);
    }
  }

  // Reject placeholder / stub descriptions: too short, or trailing colon
  // (which usually means "the next thing is a list, not a description").
  if (
    !candidate ||
    candidate.length < 60 ||
    /[:：]\s*$/.test(candidate)
  ) {
    return fallback;
  }
  return candidate;
}

function lastModForPath(relPath) {
  try {
    const iso = execSync(`git log -1 --format=%cI -- ${relPath}`, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    }).trim();
    return iso ? iso.slice(0, 10) : null;
  } catch {
    return null;
  }
}

function generate() {
  const version = extractVersion();
  const lastUpdated = extractLastUpdated();
  const exampleScenario = extractExampleScenario();
  const commands = extractCommands();
  const globalFlags = extractGlobalFlags();
  const assertions = extractAssertions();
  const stages = extractStages();
  const docs = extractDocs();
  const manpages = extractManpages();

  const lit = (v) => JSON.stringify(v, null, 2);

  const output = `// AUTO-GENERATED from the ztf source tree by
// website/scripts/extract-source-data.mjs. Do not edit by hand — re-run
// \`npm run extract\` (or just \`npm run build\` / \`npm run dev\`) to refresh.
//
// Source files:
//   - Cargo.toml                 (version)
//   - src/cli.rs                 (commands, global flags)
//   - src/config.rs              (cross-checked assertion kinds)
//   - examples/greet/ztf.toml    (canonical landing-page example)
//   - docs/*.md                  (hosted docs)
//   - man/*.md                   (manpages, assertion table)

export interface CommandData {
  name: string;
  description: string;
}

export interface FlagData {
  name: string;
  type: string;
  description: string;
}

export interface AssertionData {
  key: string;
  type: string;
  meaning: string;
}

export interface StageData {
  key: string;
  title: string;
  description: string;
}

export interface DocPage {
  slug: string;
  title: string;
  content: string;
}

export const version = ${lit(version)};
export const lastUpdated = ${lit(lastUpdated)};
export const releaseTag = ${lit(LATEST_TAG || null)};

export const exampleScenario = ${lit(exampleScenario)};

export const commands: CommandData[] = ${lit(commands)};

export const globalFlags: FlagData[] = ${lit(globalFlags)};

export const assertions: AssertionData[] = ${lit(assertions)};

export const stages: StageData[] = ${lit(stages)};

export const docs: DocPage[] = ${lit(docs)};

export const manpages: DocPage[] = ${lit(manpages)};
`;

  const dest = join(__dirname, "..", "src", "generated");
  mkdirSync(dest, { recursive: true });
  const outPath = join(dest, "sourceData.ts");
  writeFileSync(outPath, output, "utf-8");

  // Sidecar for the build-time SEO splicer. JSON is far easier to consume
  // from `render-route-heads.mjs` than the TS bundle above.
  const seoData = {
    version,
    lastUpdated,
    docs: docs.map((d) => ({
      slug: d.slug,
      title: d.title,
      description: extractSeoDescription(
        d.content,
        `${d.title} guide for ztf — the Rust CLI for agent-assisted end-to-end testing of TOML scenario files with arrange/act/assert stages and an AI-driven verdict.`,
      ),
      lastmod: lastModForPath(`docs/${d.slug}.md`),
    })),
    manpages: manpages.map((m) => ({
      slug: m.slug,
      title: m.title,
      description: extractSeoDescription(
        m.content,
        `Reference manpage for \`${m.title}\` — part of the ztf CLI for agent-assisted end-to-end testing.`,
      ),
      lastmod: lastModForPath(`man/${m.slug}.md`),
    })),
  };
  const seoPath = join(dest, "seoData.json");
  writeFileSync(seoPath, JSON.stringify(seoData, null, 2), "utf-8");

  console.log(`[extract] wrote ${outPath}`);
  console.log(`[extract] wrote ${seoPath}`);
  console.log(`[extract]   source:    ${LATEST_TAG || "working tree"}`);
  console.log(`[extract]   version:   ${version}`);
  console.log(`[extract]   commands:  ${commands.length}`);
  console.log(`[extract]   flags:     ${globalFlags.length}`);
  console.log(`[extract]   asserts:   ${assertions.length}`);
  console.log(`[extract]   docs:      ${docs.map((d) => d.slug).join(", ")}`);
  console.log(`[extract]   manpages:  ${manpages.map((m) => m.slug).join(", ")}`);
}

// Sanity check: refuse to run from the wrong directory.
if (!existsSync(join(REPO_ROOT, "Cargo.toml"))) {
  bail(`expected Cargo.toml at ${REPO_ROOT} — script must run from website/`);
}

generate();
