import { Link } from "react-router-dom";
import { docs } from "../generated/sourceData";

const blurbs: Record<string, string> = {
  "getting-started":
    "Install, write your first scenario, and run it locally.",
  configuration:
    "Every block, key, and assertion the TOML schema supports.",
  architecture:
    "How the runner, assertions, and agent reviewer compose.",
  troubleshooting:
    "Common failure modes — provider missing, parse errors, and more.",
};

export default function DocsLinks() {
  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
          Documentation
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Deep references for getting started, configuration, architecture,
          and troubleshooting — also embedded in the binary, available offline
          via <code className="text-accent">ztf docs &lt;topic&gt;</code>.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {docs.map((d) => (
            <Link
              key={d.slug}
              to={`/docs/${d.slug}`}
              className="group block rounded-lg border border-border bg-surface-alt p-5 transition-colors hover:border-accent/60 hover:bg-surface-hover"
            >
              <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-text-primary">
                {d.title}
                <span className="text-accent transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </h3>
              <p className="text-sm text-text-secondary">
                {blurbs[d.slug] ?? "Reference documentation."}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
