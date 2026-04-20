# Contributing to ztf

Thanks for your interest! This document describes how to set up a dev
environment, the conventions we follow, and how to get a change merged.

## Prerequisites

- **Rust 1.88+** (edition 2024) — install via [rustup](https://rustup.rs/). Cargo is included; no separate install needed.
- **make** — available by default on macOS and most Linux distros; on Windows use WSL or Git Bash.
- **A zag-supported LLM provider on PATH** (e.g. the `claude` CLI) — required only to exercise `agent_review` scenarios locally. Tests that don't use `agent_review` run without it.

## Getting the source

```sh
git clone https://github.com/niclaslindstedt/ztf.git
cd ztf
```

## Build, test, lint

```sh
make build
make test
make lint
make fmt-check
```

## Development workflow

1. Fork the repo.
2. Create a topic branch: `git checkout -b feat/<slug>` or `fix/<slug>`.
3. Make focused commits using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   <type>(<scope>): <summary>
   ```
   Types: `feat`, `fix`, `perf`, `docs`, `test`, `refactor`, `chore`, `ci`,
   `build`, `style`. Breaking changes: `<type>!:` or `BREAKING CHANGE:` footer.
4. Open a PR. The **PR title** must be conventional-commit format because we
   squash-merge and that title becomes the commit message on `main`.
5. CI must be green and at least one reviewer must approve.

## Tests

Tests live in `tests/` and follow the `*_test.rs` naming convention (e.g. `assertions_test.rs`).
Never add `#[cfg(test)]` blocks to source files — all test code goes in separate files.

Run the full suite:
```sh
make test          # cargo test
```

Run a single test by name:
```sh
cargo test <test_name>
```

No coverage gate is enforced yet, but every new code path should have at least one integration test
in the relevant `tests/*_test.rs` file.

## Documentation

If your change touches user-visible behavior, update the relevant `docs/`
topic and the README quick start. See `AGENTS.md` for the full sync table.

## Code of Conduct

By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting security issues

See [SECURITY.md](SECURITY.md). Do **not** open public issues for security
problems.