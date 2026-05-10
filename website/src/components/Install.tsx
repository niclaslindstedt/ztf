import CopyButton from "./CopyButton";
import { siteConfig } from "../seo/siteConfig";

const methods = [
  {
    title: "via cargo",
    note: "Recommended — pulls from crates.io",
    command: "cargo install ztf",
  },
  {
    title: "from source",
    note: "Build from main",
    command: `git clone ${siteConfig.repoUrl}
cd ztf
make install`,
  },
  {
    title: "GitHub Releases",
    note: "Pre-built binaries (when published)",
    command: `# Download from
# ${siteConfig.repoUrl}/releases`,
  },
];

export default function Install() {
  return (
    <section
      id="install"
      className="border-b border-border bg-surface-alt/40 py-20 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Install
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Pick whichever route fits your setup. ztf ships as a single binary;
          the <code className="text-accent">zag-agent</code> dependency is
          pulled in at build time.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {methods.map((m) => (
            <div
              key={m.title}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-2 font-mono text-xs text-text-secondary">
                <span>{m.title}</span>
                <CopyButton text={m.command} />
              </div>
              <pre className="m-0 overflow-x-auto p-4 font-mono text-sm leading-relaxed text-text-primary">
                <code>{m.command}</code>
              </pre>
              <div className="border-t border-border px-4 py-2 text-xs text-text-dim">
                {m.note}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-sm text-text-dim">
          Need to run without an LLM provider? Set{" "}
          <code className="text-accent">ZTF_SKIP_AGENT_REVIEW=1</code> to
          bypass <code className="text-accent">agent_review</code> blocks;
          programmatic assertions still run.
        </p>
      </div>
    </section>
  );
}
