# ztf run

> Run scenarios from one or more TOML files or directories.

## Synopsis

```
ztf run <PATH[::SCENARIO]>... [--format human|json] [--debug]
```

## Description

Each `<PATH>` is either a `.toml` scenario file or a directory that is
searched recursively for `.toml` files. Append `::<scenario>` to a
file path to run only the scenario with that name; the suffix is only
valid on a single file, not on a directory.

A fresh per-file temp directory is created and used as the working
directory for every `setup`, `arrange`, `act`, and `teardown` command.
The same path is exported as `$ZTF_TMP`.

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--format` | `human` \| `json` | `human` | Output format. JSON matches the report contract documented in `AGENTS.md`. |
| `--debug`  | bool | false | Lift debug-level output onto stderr. |
| `--help`   | bool | false | Print this manpage and exit. |
| `--version`| bool | false | Print version and exit. |

## Environment

| Variable | Description |
|---|---|
| `ZTF_TMP` | Per-file temp directory; injected into every command. |
| `ZTF_SKIP_AGENT_REVIEW` | Skip every `[scenario.agent_review]` block when set. Useful for offline / CI runs. |
| `ZTF_LOG_FILE` | Override the path of the always-on debug log. |
| `NO_COLOR` | Disable ANSI styling on stderr. |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | All scenarios passed. |
| 1 | At least one scenario failed, or a `::scenario` filter matched nothing. |
| 2 | Usage error (invalid arguments). |

## Examples

```sh
ztf run tests/smoke.toml
ztf run tests/ --format=json | jq .summary
ztf run 'tests/smoke.toml::greets a user by name'
ZTF_SKIP_AGENT_REVIEW=1 ztf run examples/greet/ztf.toml
```

## See also

- [`ztf man main`](main.md) — top-level reference.
- [`docs/getting-started.md`](../docs/getting-started.md)
