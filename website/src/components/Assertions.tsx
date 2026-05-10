import { assertions } from "../generated/sourceData";

// Assertions table — pulled from man/main.md and cross-checked against
// src/config.rs. Adding an assertion kind in one place but not the other
// fails the website build.
export default function Assertions() {
  return (
    <section className="border-b border-border py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
              Assertions
            </h2>
            <p className="mt-3 max-w-2xl text-text-secondary">
              Programmatic checks evaluated against{" "}
              <code className="text-accent">act</code>'s output and the
              filesystem. The agent review only fires when every assertion
              below passes.
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-alt px-3 py-1.5 font-mono text-xs text-text-dim">
            {assertions.length} kinds
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-lg border border-border bg-surface-alt">
          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-[minmax(0,200px)_minmax(0,200px)_1fr] md:divide-y-0">
            <div className="hidden md:contents">
              <div className="bg-surface px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-text-dim">
                key
              </div>
              <div className="bg-surface px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-text-dim">
                type
              </div>
              <div className="bg-surface px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-text-dim">
                meaning
              </div>
            </div>

            {assertions.map((a) => (
              <div
                key={a.key}
                className="grid grid-cols-1 gap-1 border-t border-border p-4 md:grid-cols-subgrid md:col-span-3 md:gap-0 md:p-0"
              >
                <div className="px-0 py-0 font-mono text-sm text-accent md:px-4 md:py-3">
                  {a.key}
                </div>
                <div className="px-0 py-0 font-mono text-xs text-text-secondary md:px-4 md:py-3">
                  {a.type}
                </div>
                <div className="px-0 py-0 text-sm text-text-secondary md:px-4 md:py-3">
                  {a.meaning}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
