// Extract project metadata from source so the website never goes stale.
// Outputs website/src/generated/sourceData.json.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve("..");

function readVersion() {
  const cargo = fs.readFileSync(path.join(repoRoot, "Cargo.toml"), "utf8");
  const match = cargo.match(/^\s*version\s*=\s*"([^"]+)"/m);
  if (!match) {
    throw new Error("could not parse [package].version from Cargo.toml");
  }
  return match[1];
}

function readExampleScenario() {
  const p = path.join(repoRoot, "examples", "greet", "ztf.toml");
  return fs.readFileSync(p, "utf8");
}

function readLastUpdated() {
  try {
    const iso = execSync("git log -1 --format=%cI", {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return iso || new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

const out = {
  name: "ztf",
  description:
    "A Rust CLI for agent-assisted end-to-end testing using TOML scenario files with arrange/act/assert stages and AI-powered final verification.",
  version: readVersion(),
  exampleScenario: readExampleScenario(),
  lastUpdated: readLastUpdated(),
  generatedAt: new Date().toISOString(),
};

const dest = path.join("src", "generated");
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(
  path.join(dest, "sourceData.json"),
  JSON.stringify(out, null, 2),
);
console.log("wrote", path.join(dest, "sourceData.json"));
