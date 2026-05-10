# ztf — agent-facing help

You are an AI agent driving `ztf`, a Rust CLI that runs end-to-end
tests defined in TOML scenario files. Use this block to teach
yourself how to call it.

## Top-level shape

```
ztf [--debug] <subcommand> [args]
```

Global flags work on every subcommand:

| Flag | Effect |
|---|---|
| `--debug` | Lift debug-level output onto stderr. The persistent log file (`~/.local/state/ztf/debug.log` on Linux) is always written. |
| `--help-agent` | Print this block. |
| `--debug-agent` | Print troubleshooting context for diagnosing a `ztf` failure. |

## Subcommands

| Command | Purpose |
|---|---|
| `run <PATH[::SCENARIO]>... [--format human|json]` | Execute scenarios. |
| `commands [<NAME>] [--examples]` | Machine-readable command index. |
| `man <NAME>` | Embedded reference manpage. |
| `docs <TOPIC>` | Embedded conceptual docs topic. |

## Decision recipe

- **"Just run my tests"** → `ztf run tests/`
- **"Run one scenario"** → `ztf run 'tests/x.toml::scenario name'`
- **"Get JSON for parsing"** → `ztf run tests/ --format=json`
- **"Skip the AI verdict"** → set `ZTF_SKIP_AGENT_REVIEW=1` in the env.
- **"Tell me what flags exist"** → `ztf commands --examples`
- **"Open the reference"** → `ztf man <name>` (start with `main`).
- **"Read a topic doc"** → `ztf docs <topic>`.

## Report contract

`ztf run --format=json` emits a stable shape (see
`ztf docs architecture` for the full schema). The most useful fields
are `summary.failed` (zero on success) and `files[].scenarios[]`.
Exit code is `0` if every scenario passed, `1` otherwise.

## Where to read more

- `ztf man main` — the top-level manpage.
- `ztf docs getting-started` — a tutorial.
- `ztf --debug-agent` — failure-diagnosis context.
