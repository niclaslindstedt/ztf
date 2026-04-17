# Configuration reference

`ztest` has no standalone config file — all configuration lives inside each
TOML scenario file. This page documents every supported key.

## Top-level

| Key | Type | Meaning |
|---|---|---|
| `[setup]` | table (optional) | File-level commands run once before any scenario in the file. |
| `[teardown]` | table (optional) | File-level commands run once after every scenario in the file. |
| `[[scenario]]` | array of tables | One or more scenarios to execute. |

### `[setup]` / `[teardown]`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `commands` | list of strings | `[]` | Shell commands run through `sh -c`, in order. Non-zero exit aborts the stage. |

Both blocks inherit the per-file temp directory as `cwd` and see
`$ZTEST_TMP` in their environment.

## `[[scenario]]`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `name` | string | — (required) | Scenario label. Used by the CLI `::<name>` filter. |
| `arrange` | table (optional) | — | Pre-`act` setup commands scoped to this scenario. |
| `act` | table | — (required) | The command under test. |
| `assert` | table (optional) | — | Programmatic checks applied to the `act` output. |
| `agent_review` | table (optional) | — | Natural-language prompt sent to a zag agent as the final gate. |

### `[scenario.arrange]`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `commands` | list of strings | `[]` | Shell commands run before `act`. Non-zero exit fails the scenario. |

### `[scenario.act]`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `command` | string | — (required) | The single command under test. Run through `sh -c`; stdout, stderr, and exit code are captured. |
| `stdin` | string | `None` | Bytes piped to the command on stdin. Written verbatim (no shell expansion). `None` attaches no pipe (reads from `/dev/null`). `""` attaches an empty pipe that closes immediately. |

### `[scenario.assert]`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `exit_code` | integer (optional) | — | Required exit code of `act.command`. |
| `stdout_contains` | list of strings | `[]` | Each substring must appear in stdout. |
| `stderr_contains` | list of strings | `[]` | Each substring must appear in stderr. |
| `file_exists` | list of strings | `[]` | Each path must exist. Relative paths resolve against the per-file temp dir; `$VAR` / `${VAR}` are expanded. |
| `file_contains` | list of `{path, contains}` | `[]` | Each named file must contain the substring. Same path-resolution rules as `file_exists`. |

### `[scenario.agent_review]`

| Key | Type | Default | Meaning |
|---|---|---|---|
| `prompt` | string | — (required) | Natural-language question for the agent. |
| `provider` | string (optional) | zag default | Override the provider (e.g. `"claude"`). |
| `model` | string (optional) | zag default | Override the model name. |

The agent review is skipped when any programmatic assertion fails.

## CLI scenario filter

The scenario filter is a CLI concern rather than a TOML key, but is documented
here for discoverability. Append `::<scenario>` to a file path on the command
line to run only the named scenario:

```sh
ztest run tests/smoke.toml::greets_user
ztest run 'tests/smoke.toml::greets a user by name'
```

- Splits on the **first** `::` (scenario names may contain `::`).
- Paths containing `::` are not supported.
- Only valid on a single `.toml` file, not on directory paths — scenario
  names are not globally unique across files.
- Missing scenario → the file's `filter_error` is set and the process exits
  non-zero.

## Environment variables

| Variable | Description |
|---|---|
| `ZTEST_TMP` | Per-file temp directory. Injected into every `setup`, `arrange`, `act`, and `teardown` command. |
