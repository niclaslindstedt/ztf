import { useState } from "react";
import CopyButton from "./CopyButton";

const tabs = [
  {
    label: "Run a file",
    code: `# Run every scenario in a file
$ ztf run tests/smoke.toml

# Run every .toml in a directory tree
$ ztf run tests/`,
  },
  {
    label: "Single scenario",
    code: `# Run only the named scenario from a file
$ ztf run 'tests/smoke.toml::greets a user by name'

# Splits on the first '::' — scenario names may contain '::'.
# File-level [setup] / [teardown] still run.`,
  },
  {
    label: "JSON for CI",
    code: `# Stable machine-readable envelope for pipelines
$ ztf run tests/ --format=json | jq .summary
{
  "total":  4,
  "passed": 4,
  "failed": 0
}

# Per-scenario breakdown
$ ztf run tests/ --format=json | jq '.files[].scenarios[]'`,
  },
  {
    label: "Skip the agent",
    code: `# Run programmatic assertions only — no LLM provider needed
$ ZTF_SKIP_AGENT_REVIEW=1 ztf run examples/greet/ztf.toml

# Useful in CI when an agent provider isn't configured,
# or when you want to gate on regex-style checks alone.`,
  },
  {
    label: "Discoverability",
    code: `# Index every command (grep-friendly, agent-friendly)
$ ztf commands

# Print the embedded reference manpage
$ ztf man run

# Print a topic from docs/, embedded in the binary
$ ztf docs configuration

# Self-describing prompt for agents
$ ztf --help-agent`,
  },
];

export default function Examples() {
  const [active, setActive] = useState(0);
  const tab = tabs[active];

  return (
    <section className="border-b border-border bg-surface-alt/40 py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          See it in action
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">
          From a single scenario to a full directory tree of TOML files — same
          binary, same exit code semantics, JSON when you want it.
        </p>

        <div className="mt-10 overflow-hidden rounded-xl border border-border bg-code shadow-2xl shadow-black/30">
          <div className="flex flex-wrap gap-1 border-b border-border bg-surface-alt px-2 py-2">
            {tabs.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setActive(i)}
                type="button"
                className={`whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                  i === active
                    ? "bg-surface text-accent"
                    : "text-text-dim hover:text-text-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
            <span className="ml-auto self-center pr-2">
              <CopyButton text={tab.code} />
            </span>
          </div>
          <pre className="m-0 overflow-x-auto p-5 font-mono text-[0.85rem] leading-relaxed text-text-primary">
            <code>{tab.code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
