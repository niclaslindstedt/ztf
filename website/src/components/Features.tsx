import { stages } from "../generated/sourceData";

// Feature copy is hand-written for landing-page punch, but the *number* and
// *names* of stages are read from source so the website can't drift if a
// stage ever gets added/renamed.
const features = [
  {
    title: "TOML-native scenarios",
    body:
      "Declare arrange / act / assert blocks without writing test code. Each scenario is a self-contained, diff-friendly file.",
  },
  {
    title: "Agent-in-the-loop verdicts",
    body:
      "Delegate fuzzy checks (\"does this output read like a polite greeting?\") to a zag-driven AI reviewer that returns a structured JSON verdict.",
  },
  {
    title: `${stages.length} explicit stages`,
    body: `${stages
      .map((s) => s.title)
      .join(
        " · ",
      )} — the lifecycle of every scenario, named in the schema. Failures are trivially diagnosable.`,
  },
  {
    title: "Programmatic gates first",
    body:
      "The agent only runs when stdout, stderr, exit code, and file checks all pass — saving tokens and keeping flakiness off the agent path.",
  },
  {
    title: "Per-file temp dirs",
    body:
      "Every command runs in a fresh temp directory exposed as $ZTF_TMP. Relative paths Just Work; cleanup is automatic.",
  },
  {
    title: "Structured machine output",
    body:
      "--format=json emits a stable envelope with file, scenario, assertion, and agent results — pipe it into jq or your CI.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="border-b border-border py-20 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Why ztf
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">
          End-to-end tests where the success criterion is too nuanced for a
          regex — but you still want a single exit code for CI.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-surface-alt p-5 transition-colors hover:border-accent/50 hover:bg-surface-hover"
            >
              <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
