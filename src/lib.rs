//! ztest — A Rust CLI for agent-assisted end-to-end testing using TOML scenario files with arrange/act/assert stages and AI-powered final verification.

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}