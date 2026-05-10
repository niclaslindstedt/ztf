# `greet` — greet a user by name

A minimal end-to-end demo of every ztf stage: `arrange` writes a tiny
shell script, `act` runs it, `assert` checks its output and side
effects, and `agent_review` asks an AI agent whether the greeting is
polite.

## Run it

From the repository root:

```sh
cargo run -- run examples/greet/ztf.toml
```

Or after `make install`:

```sh
ztf run examples/greet/ztf.toml
```

You can also run a single scenario by name:

```sh
ztf run 'examples/greet/ztf.toml::greets a user by name'
```

## With or without an agent provider

The `[scenario.agent_review]` block requires a working zag-supported
provider on `PATH` (e.g. the `claude` CLI). To run the example in a
CI environment that has no provider — or just to skip the AI step —
set:

```sh
ZTF_SKIP_AGENT_REVIEW=1 ztf run examples/greet/ztf.toml
```

The programmatic assertions (`exit_code`, `stdout_contains`,
`file_exists`) still run; only the AI verdict is skipped.

## What it covers

| Stage | What happens |
|---|---|
| `arrange` | Writes a `greet.sh` script into the per-file temp dir. |
| `act` | Runs the script with `alice\n` piped on stdin. |
| `assert` | Checks exit code 0, stdout contains `Hello, alice`, the script file still exists. |
| `agent_review` | Asks the AI whether the greeting is polite. |
