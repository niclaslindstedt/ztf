// "Runs anywhere Rust runs" — the pill row from the original site, with
// the rust-toolchain pin reflected.
const platforms = [
  "Linux (x86_64, aarch64)",
  "macOS (Intel, Apple Silicon)",
  "Windows (x86_64)",
  "Rust 1.88+ (edition 2024)",
];

export default function Platforms() {
  return (
    <section className="border-b border-border py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Runs anywhere Rust runs
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">
          ztf is a single static binary with no runtime dependencies beyond
          an optional zag-supported provider on{" "}
          <code className="text-accent">PATH</code> for{" "}
          <code className="text-accent">agent_review</code> blocks.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {platforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt px-4 py-1.5 text-sm text-text-secondary"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-pass" />
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
