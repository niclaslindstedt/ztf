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

## Pre-commit hooks

We use [pre-commit](https://pre-commit.com/) to enforce formatting,
linting, conventional-commit messages, and a CHANGELOG.md guard
locally — the same gates CI runs on the PR. Install once after
cloning:

```sh
pip install pre-commit          # or: brew install pre-commit
pre-commit install --install-hooks
pre-commit install --hook-type commit-msg
```

After that, `git commit` runs the hooks automatically. To run them
explicitly across the whole repo:

```sh
pre-commit run --all-files
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

## Where to ask things

- **Bugs** — [issues](https://github.com/niclaslindstedt/ztf/issues), bug-report template.
- **Feature requests** — [issues](https://github.com/niclaslindstedt/ztf/issues), feature-request template.
- **Questions, design discussion, "is this the right approach"** — [GitHub Discussions](https://github.com/niclaslindstedt/ztf/discussions). Please do not open issues for open-ended questions.
- **Security disclosures** — see [SECURITY.md](SECURITY.md). Never report security issues in public issues or discussions.

## Governance

ztf is currently a single-maintainer project (BDFL model). The maintainer of
record is listed in [`.github/CODEOWNERS`](.github/CODEOWNERS).

- **Decisions.** Routine decisions (bug fixes, refactors, feature additions
  that do not change the public surface) are made by the maintainer on a
  PR-by-PR basis. Any change to the public CLI surface, the report JSON
  contract, or `OSS_SPEC.md` conformance requires an issue or discussion
  thread first.
- **Merging.** Only the maintainer (and accounts listed in CODEOWNERS) can
  merge to `main`. PRs are squash-merged; the PR title becomes the commit on
  `main` and must be a valid conventional-commit subject (CI enforces this).
- **Adding maintainers.** A contributor with a sustained track record of
  high-quality PRs and reviews may be invited to join CODEOWNERS by the
  current maintainer. There is no formal voting process — invitations
  happen on merit.
- **Disputes.** When two contributors disagree, the maintainer is the
  tiebreaker. Disagreements with the maintainer can be escalated as a
  GitHub Discussion; if the project later grows multiple maintainers, this
  paragraph will be replaced with a proper voting model.
- **Abandonment.** If the maintainer becomes inactive for six months
  without a designated successor, any contributor may open an issue
  proposing a successor. After 30 days without objection from the
  original maintainer, the proposal is taken as accepted and the
  successor takes over CODEOWNERS.

## Code of Conduct

By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting security issues

See [SECURITY.md](SECURITY.md). Do **not** open public issues for security
problems.