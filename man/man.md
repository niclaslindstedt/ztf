# ztf man

> Print the embedded reference manpage for `<name>`.

## Synopsis

```
ztf man <NAME>
```

## Description

Prints the manpage for a `ztf` command or topic. Manpages are embedded
in the binary at compile time, so this works without a working
internet connection or a checked-out repository.

Available names: `main`, `run`, `commands`, `man`, `docs`. Run
`ztf commands` to enumerate them programmatically.

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--debug` | bool | false | Lift debug-level output onto stderr. |
| `--help` | bool | false | Print this manpage and exit. |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Manpage printed. |
| 1 | Unknown manpage name. |

## Examples

```sh
ztf man main
ztf man run
ztf man commands
```

## See also

- [`ztf docs <topic>`](docs.md) — for conceptual documentation rather than reference manpages.
