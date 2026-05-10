import { exampleScenario, stages } from "../generated/sourceData";
import TomlBlock from "./TomlBlock";
import CopyButton from "./CopyButton";

// The signature visual: the canonical examples/greet/ztf.toml on the left,
// the four scenario stages explained on the right, then the rendered
// terminal output below. Everything here is pulled from source.

function StageOutput() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-code">
      <div className="border-b border-border bg-surface-alt px-4 py-2 font-mono text-xs text-text-secondary">
        $ ztf run examples/greet/ztf.toml
      </div>
      <div className="p-5 font-mono text-[0.85rem] leading-relaxed">
        <div className="out-dim">examples/greet/ztf.toml</div>
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
          <span className="col-span-2 out-dim italic">
            "Greets the user by name in a natural, polite way."
          </span>
        </div>
        <div className="mt-3 out-dim">
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

export default function ScenarioAnatomy() {
  return (
    <section
      id="example"
      className="border-b border-border bg-surface-alt/40 py-20 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          A scenario, end-to-end
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">
          The full <code className="font-mono text-accent">examples/greet</code>{" "}
          demo, lifted directly from the repo. Arrange a tiny shell script,
          run it, assert against stdout and the filesystem, and let the agent
          decide whether the greeting reads naturally.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <TomlBlock
            source={exampleScenario}
            filename="examples/greet/ztf.toml"
            actions={<CopyButton text={exampleScenario} />}
          />
          <StageOutput />
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((s, i) => (
            <div
              key={s.key}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-dim">
                <span className="text-accent">{String(i + 1).padStart(2, "0")}</span>
                <span>{s.title}</span>
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
