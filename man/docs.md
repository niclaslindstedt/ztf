# ztf docs

> Print the embedded conceptual documentation topic for `<topic>`.

## Synopsis

```
ztf docs <TOPIC>
```

## Description

Prints the topic-level documentation embedded in the binary. Use
`ztf man <name>` for command-reference manpages instead.

Available topics: `getting-started`, `configuration`, `architecture`,
`troubleshooting`.

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--debug` | bool | false | Lift debug-level output onto stderr. |
| `--help` | bool | false | Print this manpage and exit. |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Topic printed. |
| 1 | Unknown topic. |

## Examples

```sh
ztf docs getting-started
ztf docs architecture
```

## See also

- [`ztf man <name>`](man.md) — for command-reference manpages.
