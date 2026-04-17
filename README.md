# ztest

A Rust CLI for agent-assisted end-to-end testing using TOML scenario files with arrange/act/assert stages and AI-powered final verification.

[![CI](https://github.com/niclaslindstedt/ztest/actions/workflows/ci.yml/badge.svg)](https://github.com/niclaslindstedt/ztest/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Why?

- TOML-native scenario authorship — define setup, commands, scripts, and assertions without writing code
- Agent-in-the-loop verdicts — delegate nuanced, context-sensitive checks to an AI reviewer instead of brittle regex assertions
- Structured machine-readable output — every test run emits a parseable result envelope consumed directly by the ztest CLI
- Global fixtures — shared setup and teardown blocks (temp dirs, seed data, env vars) reused across scenario files
- First-class arrange/act/assert separation — forces explicit test lifecycle stages, making failures trivially diagnosable


## Prerequisites

- _List runtime and dev dependencies with explicit version bounds._

## Install

```sh
# end-to-end install command goes here
```

## Quick start

```sh
# minimal runnable example
```

## Usage

_Reference surface — commands, flags, API entry points._

## Configuration

_Config file paths and key names._

## Examples

See [`examples/`](examples/) for runnable demos.

## Troubleshooting

_Common failure modes and fixes._

## Documentation

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [Troubleshooting](docs/troubleshooting.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Licensed under [MIT](LICENSE).