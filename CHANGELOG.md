# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is **auto-generated from conventional commits at release time** —
do not edit manually.

## [Unreleased]

This project has not yet cut a versioned release. The entries below will be
promoted to a `## [0.1.0]` block when the first release is tagged. Until then,
all shipped changes are tracked here.

### Added
- TOML-driven scenario runner with `arrange` / `act` / `assert` / `agent_review` stages
- File-level `[setup]` and `[teardown]` blocks
- Programmatic assertions: `exit_code`, `stdout_contains`, `stderr_contains`, `file_exists`, `file_contains`
- AI-powered verdict via `zag-agent` (called only when all programmatic assertions pass)
- Human-readable and JSON (`--format=json`) output modes
- Per-file isolated temp directory (`$ZTEST_TMP`) injected into every command
- `make build / test / lint / fmt / fmt-check` targets
- GitHub Actions CI and release workflows

