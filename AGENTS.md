# Agent guidance for ztest

This file is the canonical source of truth for AI coding agents working in this
repo. `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `GEMINI.md`,
`.aider.conf.md`, and `.github/copilot-instructions.md` are symlinks to this
file.

## OSS Spec conformance

This repository adheres to [`OSS_SPEC.md`](OSS_SPEC.md), a prescriptive
specification for open source project layout, documentation, automation, and
governance. A copy of the spec lives at the repository root so contributors and
AI agents can consult it without leaving the repo; its version is recorded in
the YAML front matter at the top of the file.

Run `oss-spec validate .` to verify conformance. When in doubt about a layout,
naming, or workflow decision, consult the relevant section of `OSS_SPEC.md` —
it is the source of truth for the conventions this repo follows.

## Build and test commands

```sh
make build         # developer build
make test          # full test suite
make lint          # zero-warning linter
make fmt           # format in place
make fmt-check     # verify formatting (CI)
```

## Commit and PR conventions

- All commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- PRs are squash-merged; the **PR title** becomes the single commit on `main`,
  so it must follow conventional-commit format.
- Breaking changes use `<type>!:` or a `BREAKING CHANGE:` footer.

## What ztest is

`ztest` is a Rust CLI that runs agent-assisted end-to-end tests defined in TOML
scenario files. Each scenario has four stages — `arrange`, `act`, `assert`, and
optional `agent_review` — plus file-level `[setup]` / `[teardown]` blocks. The
runner executes shell commands, evaluates programmatic assertions against their
output and the filesystem, then (if asserts pass) asks a [zag](https://crates.io/crates/zag-agent)
AI agent to deliver a structured JSON verdict as the final gate.

Target audience: projects that need end-to-end tests where the success criterion
is too nuanced for a regex (e.g. *"did the generated code look reasonable?"*)
but still want a single exit code for CI.

## Architecture summary

**Entry point → core modules** — all in `src/`:

| Module | Role |
|---|---|
| `main.rs` | Tokio runtime entry; parses `Cli` via clap; dispatches to `lib::run`; sets exit code from `Report::all_passed`. |
| `lib.rs`  | Public surface: re-exports `run`, `Report`, and module tree. |
| `cli.rs`  | Clap `Cli` / `Command::Run { paths, format }`, `Format` enum. |
| `config.rs` | Serde deserialisation of the TOML schema: `TestFile`, `Setup`, `Teardown`, `Scenario`, `Arrange`, `Act`, `Assert`, `FileContains`, `AgentReview`. `parse(&str)` and `load(&Path)`. |
| `shell.rs` | `run_command(cmd, cwd, env) -> CmdOutput { stdout, stderr, exit_code }` — every command runs via `sh -c` with cwd set to the per-file temp dir. |
| `assertions.rs` | `evaluate(&Assert, &CmdOutput, cwd, env) -> Vec<AssertionResult>`; handles `$VAR` / `${VAR}` expansion and resolves relative paths against cwd. |
| `agent.rs` | `verify(&AgentReview, VerifyContext)` — builds a prompt including scenario name, command, exit code, truncated stdout/stderr; calls `zag_agent::builder::AgentBuilder` with a fixed JSON schema `{passed: bool, reasoning: string}`; returns `AgentVerdict`. Failures (transport, schema, parse) become `passed: false` with reasoning carrying the error. |
| `runner.rs` | Orchestrator: `discover(paths)` → for each file create a fresh `TempDir`, inject `ZTEST_TMP`, run setup → scenarios → teardown, build `Report`. Agent is called only when **all** programmatic assertions pass. |
| `report.rs` | `Report`, `FileReport`, `ScenarioResult`, `Summary`; human (`render_human`) and JSON (`render_json`) renderers; `all_passed()` drives the CLI exit code. |

**Dependency direction** — modules layer cleanly, no cycles:

```
main.rs → cli.rs
main.rs → lib.rs → runner.rs → { config, shell, assertions, agent, report }
                                             ↘ shell (CmdOutput) ↙
```

**External dependencies** (see `Cargo.toml`):
- `zag-agent` (from crates.io) — the only AI-related dep; isolated inside `src/agent.rs`.
- `clap` (derive), `serde` + `toml` + `serde_json` (schema / output), `tokio` (async runtime + `process`), `tempfile`, `anyhow`.

**Temp dir contract** (load-bearing): every `setup`, `arrange`, `act`, and
`teardown` command runs with **cwd = per-file temp dir**. The same path is also
exported as `$ZTEST_TMP` for commands that `cd` elsewhere and need an anchor.
`file_exists` / `file_contains` resolve relative paths against that cwd too.

## Extending ztest — where things go

- **New assertion kind** → add the field to `Assert` in `src/config.rs`, a
  matching arm in `assertions::evaluate` (with an `AssertionResult { kind, ... }`),
  a case in `tests/assertions_test.rs`, and a row in `man/main.md`'s
  Assertions table.
- **New CLI subcommand / flag** → extend the `Command` enum in `src/cli.rs`
  and `main.rs`, then update `man/main.md` and the README "Usage" section.
- **New stage / block** → add to the schema in `src/config.rs`, wire it into
  `runner::run_file` / `run_scenario` in execution order, then document it in
  `man/main.md` + `README.md` + `docs/getting-started.md`.
- **Agent tweaks** (schema, prompt format, provider defaults) are confined to
  `src/agent.rs`. Keep `zag_agent` types out of other modules.
- **Parallelism or multi-session orchestration** → introduce `zag-orch` here
  (deliberately out of scope for the MVP).

## Report JSON contract

Consumed by other tools / CI pipelines; changes to shape are **user-visible**
and need a matching doc update and a migration story:

```json
{
  "files": [
    {
      "path": "tests/smoke.toml",
      "scenarios": [
        {
          "name": "...",
          "passed": true,
          "assertions": [{"kind": "...", "passed": true, "detail": "..."}],
          "agent":   {"passed": true, "reasoning": "..."}
        }
      ],
      "setup_error":    "...",
      "teardown_error": "..."
    }
  ],
  "summary": {"total": 1, "passed": 1, "failed": 0}
}
```

Exit code: `0` if `summary.failed == 0` and no file had a `setup_error`; `1`
otherwise.

## Where new code goes

| Change type | Goes in |
|---|---|
| New feature | `src/...` |
| Tests       | `tests/...` |
| Docs update | `docs/...` |
| Examples    | `examples/...` |
| LLM prompt  | `prompts/<name>/<major>_<minor>.md` (see `prompts/README.md`) |

## Test conventions

- **All tests live in separate files** — never inline in source files (no `#[cfg(test)]` blocks, no `if __name__ == "__main__"` test harnesses). This keeps source files free of test scaffolding and lets agents, hooks, and linters treat source and test code differently.
- Test files are named with a `_test` or `_tests` suffix (e.g. `check_test.rs`, `utils_test.py`). The stem must match the pattern `_?[Tt]ests?$` per §20 of `OSS_SPEC.md`.
- Tests live in `tests/`. Use `tempfile` or equivalent for any test that writes to the filesystem.

## Documentation sync points

When you change… | Update…
--- | ---
public API | `docs/`, `README.md` Quick start
CLI flags  | `man/<cmd>.md`, `README.md`
config keys| `docs/configuration.md`

## Parity / cross-cutting rules

- **New assertion kind** — adding a field to `Assert` in `src/config.rs` requires a matching arm in `src/assertions.rs`, a test case in `tests/assertions_test.rs`, and a row in the `man/main.md` Assertions table. All four must land in the same PR.
- **CLI flag or subcommand** — any change to `src/cli.rs` must be mirrored in `man/main.md` and the README Usage section before merge.
- **Report JSON shape** — the shape documented in the "Report JSON contract" section above must stay in sync with `src/report.rs`. Any structural change is user-visible and needs a matching doc update.
- **New stage / block** — schema (`src/config.rs`), runner wiring (`src/runner.rs`), and documentation (`man/main.md`, `README.md`, `docs/getting-started.md`) must all be updated together.

## Website staleness policy

Per §11.2 of `OSS_SPEC.md`, the marketing/documentation website must be regenerated whenever source-derived content changes. Run `make website` (which chains `npm run extract && vite build`) whenever any of the following change:

- CLI flags or subcommands (`src/cli.rs`)
- Configuration keys or TOML schema (`src/config.rs`)
- Supported platforms or install instructions (`README.md`)
- Example scenario snippets (`examples/`)

The `pages` CI job enforces this on every PR by verifying the built site is up-to-date.

## Maintenance skills

Per §21 of `OSS_SPEC.md`, this repo ships agent skills for keeping drift-prone artifacts in sync with their sources of truth. Skills live under `.agent/skills/<name>/` and are also accessible via the `.claude/skills` symlink.

| Skill | When to run |
|---|---|
| `maintenance`   | When several artifacts have likely drifted at once — umbrella skill that runs every `update-*` skill in the correct order. |
| `update-docs`   | After any change to the public API, configuration keys, or error messages. |
| `update-readme` | After any change that alters user-visible behavior, commands, or install instructions. |

Each skill has a `SKILL.md` (the playbook) and a `.last-updated` file (the baseline commit hash). Run a skill by loading its `SKILL.md` and following the discovery process and update checklist. The skill rewrites `.last-updated` at the end of a successful run, and improves itself in place when it discovers new mapping entries. The `maintenance` skill owns a **Registry** table listing every `update-*` skill — add a row whenever you create a new sync skill.