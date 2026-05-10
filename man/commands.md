# ztf commands

> Print a machine-readable index of every command and its flags / exit codes.

## Synopsis

```
ztf commands [<NAME>] [--examples]
```

## Description

Emits a JSON document describing each top-level command, the flags it
accepts, and its exit codes. With a `<NAME>` argument the output is
restricted to a single command. With `--examples`, canonical example
invocations are included so an agent or downstream tool can copy
ready-to-run commands.

This surface is part of the §12.5 discoverability contract — agents
parsing it should treat the JSON shape as stable.

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--examples` | bool | false | Include example invocations for each command. |
| `--debug` | bool | false | Lift debug-level output onto stderr. |
| `--help` | bool | false | Print this manpage and exit. |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Output written successfully. |
| 1 | Unknown command name. |

## Examples

```sh
ztf commands
ztf commands run
ztf commands --examples | jq '.commands[] | {name, examples}'
ztf commands run --examples
```

## See also

- [`ztf man main`](main.md)
