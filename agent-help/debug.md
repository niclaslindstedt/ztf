# ztf — agent-facing debugging context

You are an AI agent diagnosing a `ztf` failure. This block lists the
files, paths, and environment variables most likely to matter, plus
the common failure modes and how to disambiguate them.

## Always-on debug log

`ztf` writes every helper-routed message to a persistent debug log
regardless of whether `--debug` was passed:

| OS | Path |
|---|---|
| Linux | `$XDG_STATE_HOME/ztf/debug.log` (default `~/.local/state/ztf/debug.log`) |
| macOS | `~/Library/Application Support/ztf/debug.log` |
| Windows | `%LOCALAPPDATA%\ztf\debug.log` |

Override via `ZTF_LOG_FILE`. With `--debug` the same messages are
also lifted onto stderr.

## Environment variables

| Variable | Effect |
|---|---|
| `ZTF_TMP` | Per-file temp directory; injected automatically into every command and visible inside scenario shell commands. |
| `ZTF_SKIP_AGENT_REVIEW` | Skip every `[scenario.agent_review]` block when set. Useful when no LLM provider is on `PATH`. |
| `ZTF_LOG_FILE` | Override the default debug-log path. |
| `NO_COLOR` | Disable ANSI styling on stderr. |

## Common failure modes

| Symptom | Most likely cause | Fix |
|---|---|---|
| `tempdir creation failed` | `$TMPDIR` is unwritable. | Point `$TMPDIR` at a writable location. |
| `setup: <cmd> exited <N>` | A `[setup]` command returned non-zero. The whole file is reported as `setup_error` and every scenario is skipped. | Inspect stderr in the report; fix the failing setup command. |
| `arrange: <cmd>: ...` | An `arrange.commands` entry failed. Single scenario fails before assertions run. | Same as above, but per-scenario. |
| `agent invocation failed: …` | The zag provider could not be reached (binary missing, auth failed, schema rejected). | Install/configure the provider, or set `ZTF_SKIP_AGENT_REVIEW=1` to bypass for now. |
| `could not parse agent JSON` | The provider returned text the schema validator rejected. | Tighten the `[scenario.agent_review].prompt` or update the model. |
| `no scenario named '<name>'` | The `::scenario` filter did not match any scenario in the file. | Double-check the scenario name; spelling and spaces matter. |

## Useful one-liners

```sh
# Re-run a failure with debug output:
ztf --debug run tests/x.toml

# Inspect the log file from this run:
tail -50 "${ZTF_LOG_FILE:-${XDG_STATE_HOME:-$HOME/.local/state}/ztf/debug.log}"

# Skip the AI step entirely while debugging asserts:
ZTF_SKIP_AGENT_REVIEW=1 ztf run tests/

# Get a strict JSON report for tooling:
ztf run tests/ --format=json | jq '.summary'
```

## Report shape

See `ztf docs architecture` for the canonical schema. The shape is a
stable contract; downstream tools may rely on it.
