# Getting started with ztest

> A Rust CLI for agent-assisted end-to-end testing using TOML scenario files with arrange/act/assert stages and AI-powered final verification.

## Install

```sh
git clone https://github.com/niclaslindstedt/ztest
cd ztest
make install
```

`ztest` depends on the `zag-agent` crate by path (`../zag/zag-agent`), so clone [zag](https://github.com/niclaslindstedt/zag) next to this checkout. For the `agent_review` step to succeed at runtime you also need a zag-supported provider binary on `PATH` (e.g. the `claude` CLI).

## First run

The repo ships with a working demo in `examples/`:

```sh
cargo run -- run examples/greet.toml
```

That TOML defines a single scenario that writes `alice` to a temp file, pipes it into `examples/greet.sh`, asserts the exit code and stdout, and then asks the agent whether the greeting looks natural. Remove the `[scenario.agent_review]` block to run offline.

### Anatomy of a scenario

```toml
[[scenario]]
name = "greets a user"

  [scenario.arrange]
  commands = ["echo 'alice' > name.txt"]

  [scenario.act]
  command = "cat name.txt | ./greet.sh"

  [scenario.assert]
  exit_code       = 0
  stdout_contains = ["Hello, alice"]
  file_exists     = ["name.txt"]

  [scenario.agent_review]
  prompt = "Does the program greet the user politely? Pass if yes."
```

- Every command runs with cwd set to a fresh per-file temp directory, so plain relative paths Just Work. That directory is also exported as `$ZTEST_TMP` — useful as an anchor when a command `cd`'s away and later needs to come back. Relative `file_exists` / `file_contains` paths resolve against the same directory.
- Programmatic assertions are evaluated first; if any fail, the agent review is skipped.
- The agent responds with a JSON verdict `{ "passed": bool, "reasoning": string }`. `ztest` fails the scenario if the agent returns `passed: false` or if the response cannot be parsed.

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
