//! ztf — agent-assisted end-to-end testing driven by TOML scenario files.

pub mod agent;
pub mod assertions;
pub mod cli;
pub mod config;
pub mod report;
pub mod runner;
pub mod shell;

pub use report::Report;
pub use runner::run;

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
