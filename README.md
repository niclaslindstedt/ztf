# ztf

A Rust CLI for agent-assisted end-to-end testing using TOML scenario files with arrange/act/assert stages and AI-powered final verification.

[![CI](https://github.com/niclaslindstedt/ztf/actions/workflows/ci.yml/badge.svg)](https://github.com/niclaslindstedt/ztf/actions/workflows/ci.yml)
[![crates.io](https://img.shields.io/crates/v/ztf.svg)](https://crates.io/crates/ztf)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## What

`ztf` runs end-to-end tests authored as TOML scenarios. Each scenario has an
`arrange` block (setup commands), an `act` block (the single command under
test), an `assert` block (programmatic checks against stdout/stderr/exit
code/files), and an optional `agent_review` block in which an AI agent
delivers the final verdict for criteria too nuanced for a regex. The runner
returns a single exit code suitable for CI plus a structured JSON report.

## Why

- TOML-native scenario authorship — define setup, commands, scripts, and assertions without writing code
- Agent-in-the-loop verdicts — delegate nuanced, context-sensitive checks to an AI reviewer instead of brittle regex assertions
- Structured machine-readable output — every test run emits a parseable result envelope consumed directly by the ztf CLI
- Global fixtures — shared setup and teardown blocks (temp dirs, seed data, env vars) reused across scenario files
- First-class arrange/act/assert separation — forces explicit test lifecycle stages, making failures trivially diagnosable


## Prerequisites

- Rust 1.88+ (edition 2024)
- For the `agent_review` step to actually run, a zag-supported provider must be on `PATH` (e.g. the `claude` CLI). The `zag-agent` crate is pulled in from crates.io automatically.

## Install

```sh
git clone https://github.com/niclaslindstedt/ztf
cd ztf
make install          # cargo install --path .
```

## Quick start

Write a scenario file:

```toml
# tests/smoke.toml
[[scenario]]
name = "greets a user"

  [scenario.act]
  command = "./greet.sh"
  stdin   = "alice\n"

  [scenario.assert]
  exit_code       = 0
  stdout_contains = ["Hello, alice"]

  [scenario.agent_review]
  prompt = "Does the program greet the user politely? Pass if yes."
```

Run it:

```sh
ztf run tests/smoke.toml
ztf run tests/ --format=json | jq .summary
ztf run 'tests/smoke.toml::greets a user'   # run one scenario by name
```

Exit code is `0` if every scenario passed, `1` otherwise.

## Usage

```
ztf run <path[::scenario]>...   Run scenarios from one or more TOML files or directories
                                  (recursed for *.toml). Append `::<scenario>` to a file path
                                  to run only the named scenario.
    --format human|json           Output format (default: human).
```

Each scenario supports four blocks: `arrange` (setup commands), `act` (the single command under test;
its `stdin` field pipes text to the command on stdin), `assert` (programmatic checks: `exit_code`,
`stdout_contains`, `stderr_contains`, `file_exists`, `file_contains`), and an optional `agent_review`
with a free-form prompt for the AI verifier. A file may also declare top-level `[setup]` and
`[teardown]` command blocks that run once per file.

The runner creates a fresh temp directory per file and uses it as the working directory for every
`setup`, `arrange`, `act`, and `teardown` command, so plain relative paths like `./greet.sh` and
`name.txt` Just Work. The same directory is also exported as `$ZTF_TMP` — useful as an anchor when a
command `cd`'s elsewhere. The agent verdict is skipped when any programmatic assertion fails, so agent
calls only happen on otherwise-passing scenarios.

## Configuration

`ztf` itself has no config file. Per-scenario agent overrides (`provider`, `model`) live inside each
`[scenario.agent_review]` block in the scenario's TOML file.

## Examples

See [`examples/`](examples/) for runnable demos. Each example lives in its
own subdirectory with a `README.md` and a `ztf.toml` scenario file:

- [`examples/greet/`](examples/greet/) — minimal `arrange` / `act` /
  `assert` / `agent_review` walkthrough.

Run any example without an LLM provider by setting
`ZTF_SKIP_AGENT_REVIEW=1`:

```sh
ZTF_SKIP_AGENT_REVIEW=1 ztf run examples/greet/ztf.toml
```

## Troubleshooting

**Agent provider not found** — `agent_review` scenarios fail with a "command not found" or provider error.
Install a zag-supported provider (e.g. the `claude` CLI) and make sure it is on `PATH`. You can verify
with `which claude`. Scenarios without `agent_review` blocks are unaffected.

**TOML parse error on startup** — `ztf run` exits immediately with a parse error.
Check the scenario file for missing quotes, incorrect table headers (use `[[scenario]]`, not `[scenario]`),
or mismatched brackets. Run `taplo lint <file>.toml` for structured diagnostics.

**Non-zero exit from `[setup]` block** — the entire file is skipped and reported as a setup error.
The setup error message appears in both human and JSON output. Fix the failing setup command; all
scenarios in that file are blocked until setup succeeds.

## Documentation

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [Troubleshooting](docs/troubleshooting.md)

## Community

- **Bug reports** — open an [issue](https://github.com/niclaslindstedt/ztf/issues/new?template=bug_report.md) with a minimal reproduction.
- **Feature requests** — open an [issue](https://github.com/niclaslindstedt/ztf/issues/new?template=feature_request.md) describing the use case.
- **Questions and discussion** — use [GitHub Discussions](https://github.com/niclaslindstedt/ztf/discussions); please don't open issues for general questions.
- **Security reports** — see [SECURITY.md](SECURITY.md). Never disclose security issues in public issues.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Licensed under [MIT](LICENSE).