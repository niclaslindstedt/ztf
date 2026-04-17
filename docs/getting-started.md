# Getting started with ztest

> A Rust CLI for agent-assisted end-to-end testing using TOML scenario files with arrange/act/assert stages and AI-powered final verification.

## Install

```sh
git clone https://github.com/niclaslindstedt/ztest
cd ztest
make install
```

For the `agent_review` step to succeed at runtime you need a zag-supported provider binary on `PATH` (e.g. the `claude` CLI). The `zag-agent` crate itself is resolved from crates.io.

## First run

The repo ships with a working demo in `examples/`:

```sh
cargo run -- run examples/greet.toml
```

That TOML defines a single scenario that writes a tiny `greet.sh` to the temp directory, runs it with `alice\n` piped on stdin, asserts the exit code and stdout, and then asks the agent whether the greeting looks natural. Remove the `[scenario.agent_review]` block to run offline.

### Running a single scenario

A file can hold many scenarios. Append `::<name>` to the file path to run just one:

```sh
cargo run -- run 'examples/greet.toml::greets a user by name'
```

The filter splits on the first `::`, so scenario names may contain `::`. It is only valid on a single `.toml` file — not on a directory.

### Anatomy of a scenario

```toml
[[scenario]]
name = "greets a user"

  [scenario.arrange]
  commands = [
'''
cat > greet.sh <<'SCRIPT'
#!/bin/sh
name=$(cat)
printf 'Hello, %s\n' "$name"
SCRIPT
chmod +x greet.sh
''',
  ]

  [scenario.act]
  command = "./greet.sh"
  stdin   = "alice\n"

  [scenario.assert]
  exit_code       = 0
  stdout_contains = ["Hello, alice"]
  file_exists     = ["greet.sh"]

  [scenario.agent_review]
  prompt = "Does the program greet the user politely? Pass if yes."
```

- Every command runs with cwd set to a fresh per-file temp directory, so plain relative paths Just Work. That directory is also exported as `$ZTEST_TMP` — useful as an anchor when a command `cd`'s away and later needs to come back. Relative `file_exists` / `file_contains` paths resolve against the same directory.
- `act.stdin` (optional) is piped verbatim to the command — no shell expansion. Omit it and the child reads from `/dev/null`. Use it for commands that prompt for input.
- Programmatic assertions are evaluated first; if any fail, the agent review is skipped.
- The agent responds with a JSON verdict `{ "passed": bool, "reasoning": string }`. `ztest` fails the scenario if the agent returns `passed: false` or if the response cannot be parsed.
- `[setup]` and `[teardown]` run once per file, regardless of whether a `::scenario` filter narrowed the scenario list.

### JSON output for CI

```sh
ztest run tests/ --format=json
```

The envelope is:

```json
{
  "files": [ { "path": "…", "scenarios": [ … ] } ],
  "summary": { "total": 1, "passed": 1, "failed": 0 }
}
```

Exit code is `0` on all-pass, `1` otherwise.

## Next steps

- [Configuration reference](configuration.md)
- [Architecture overview](architecture.md)
- [Troubleshooting](troubleshooting.md)
