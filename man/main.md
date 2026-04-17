# ztest

> A Rust CLI for agent-assisted end-to-end testing using TOML scenario files with arrange/act/assert stages and AI-powered final verification.

## Synopsis

```
ztest run <PATHS>... [--format human|json]
```

## Description

`ztest` reads TOML scenario files and runs them against the local shell. Each scenario has four blocks:

- `arrange.commands` — setup commands to prepare state.
- `act.command` — the single command under test. Its stdout, stderr, and exit code are captured.
- `assert` — programmatic checks applied to `act`'s output and the filesystem.
- `agent_review` (optional) — a natural-language prompt sent to a zag AI agent for the final verdict.

A TOML file may also declare top-level `[setup]` and `[teardown]` blocks that run once per file. Every run creates a fresh temp directory; that directory becomes the working directory for every `setup`, `arrange`, `act`, and `teardown` command, and is also exported as `$ZTEST_TMP` as an escape hatch when a command `cd`'s elsewhere.

## Subcommands

| Command | Description |
|---|---|
| `run <PATHS>...` | Run every scenario in the given files or directories (recursed for `*.toml`). |
| `help`           | Show help text. |

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--format` | `human` \| `json` | `human` | Output format. |
| `--version` | bool | false | Print version and exit. |
| `--help`    | bool | false | Print help and exit. |

## Assertions

| Key | Type | Meaning |
|---|---|---|
| `exit_code` | integer | Required exit code of the `act` command. |
| `stdout_contains` | list of strings | Each substring must appear in stdout. |
| `stderr_contains` | list of strings | Each substring must appear in stderr. |
| `file_exists` | list of paths | Each path must exist after `act`. Supports `$ZTEST_TMP` expansion. |
| `file_contains` | list of `{path, contains}` | Each named file must contain the substring. |

The agent review is skipped if any programmatic assertion fails.

## Environment variables

| Variable | Description |
|---|---|
| `ZTEST_TMP` | Per-file temp directory, injected into every `act`, `arrange`, `setup`, and `teardown` command. |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | All scenarios passed |
| 1 | At least one scenario failed |
| 2 | Usage error |

## Examples

```sh
ztest run tests/smoke.toml
ztest run tests/ --format=json | jq .summary
```

## See also

- [`docs/getting-started.md`](../docs/getting-started.md)
