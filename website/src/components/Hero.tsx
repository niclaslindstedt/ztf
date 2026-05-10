import { version } from "../generated/sourceData";
import CopyButton from "./CopyButton";

const installCommand = "cargo install ztf";

// A static replica of `ztf run examples/greet/ztf.toml`'s human output.
// Static (rather than animated) because ztf's identity is "one CI exit code,
// no surprises" — a dependable terminal frame conveys that better than a
// typewriter effect.
function HeroTerminal() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-code shadow-2xl shadow-accent/5">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-border bg-surface-alt px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="font-mono text-xs text-text-dim">
          ztf — examples/greet
        </span>
      </div>

      {/* Body */}
      <div className="p-5 font-mono text-[0.85rem] leading-relaxed">
        <div>
          <span className="out-accent">$</span>{" "}
          <span className="text-text-primary">ztf run examples/greet/ztf.toml</span>
        </div>

        <div className="mt-4 out-dim">examples/greet/ztf.toml</div>

        <div className="mt-1">
          <span className="out-pass">✓</span>{" "}
          <span className="text-text-primary">greets a user by name</span>
        </div>

        <div className="ml-6 grid grid-cols-[max-content_1fr] gap-x-4 text-[0.82rem]">
          <span className="out-dim">assert exit_code</span>
          <span className="out-pass">pass</span>
          <span className="out-dim">assert stdout_contains</span>
          <span className="out-pass">pass</span>
          <span className="out-dim">assert file_exists</span>
          <span className="out-pass">pass</span>
          <span className="out-dim">agent  verdict</span>
          <span className="out-pass">pass</span>
          <span className="col-span-2 out-dim">
            "Greets the user by name in a natural, polite way."
          </span>
        </div>

        <div className="mt-4 out-dim">
          ───────────────────────────────────────
        </div>

        <div className="grid grid-cols-[max-content_1fr] gap-x-4">
          <span className="out-pass">summary</span>
          <span>
            <span className="out-dim">total:</span> 1{" "}
            <span className="out-dim">passed:</span> 1{" "}
            <span className="out-dim">failed:</span> 0
          </span>
          <span className="out-dim">exit</span>
          <span className="out-pass">0</span>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-border pt-32 pb-20 md:pt-40 md:pb-28"
    >
      {/* Amber halo behind the wordmark — subtle. */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-200px] h-[420px] w-[860px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(247,181,0,0.18), transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <a
          href={`https://crates.io/crates/ztf/${version}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt px-3.5 py-1 font-mono text-xs text-text-secondary hover:border-accent/60 hover:text-text-primary transition-colors"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          v{version} · on crates.io
        </a>

        <h1 className="mx-auto max-w-3xl font-sans text-4xl font-extrabold leading-tight tracking-tight text-text-primary md:text-6xl md:leading-[1.05]">
          One exit code.{" "}
          <span className="text-accent">Nuanced verdicts.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-text-secondary md:text-lg">
          ztf is a Rust CLI for end-to-end tests where the success criterion
          is too nuanced for a regex — but you still want a single exit code
          for CI. Author scenarios in TOML, run them with one binary, get a
          structured verdict from an AI reviewer as the final gate.
        </p>

        {/* Install line + CTA buttons */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          <code className="relative inline-flex items-center gap-3 rounded-md border border-border bg-surface-alt px-4 py-2.5 font-mono text-sm text-text-primary">
            <span className="text-accent">$</span>
            <span>{installCommand}</span>
            <CopyButton text={installCommand} />
          </code>
          <a
            href="#example"
            className="rounded-md border border-border-strong bg-surface-alt px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-accent"
          >
            See an example
          </a>
        </div>

        {/* Terminal panel */}
        <div className="mx-auto mt-12 max-w-3xl text-left">
          <HeroTerminal />
        </div>
      </div>
    </section>
  );
}
