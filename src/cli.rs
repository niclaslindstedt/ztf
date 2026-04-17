use clap::{Parser, Subcommand, ValueEnum};
use std::path::PathBuf;

#[derive(Debug, Parser)]
#[command(name = "ztest", version, about = "Agent-assisted end-to-end testing")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Run test scenarios from TOML file(s) or directory tree(s).
    Run {
        /// Paths to .toml files or directories (searched recursively).
        #[arg(required = true)]
        paths: Vec<PathBuf>,

        /// Output format.
        #[arg(long, value_enum, default_value_t = Format::Human)]
        format: Format,
    },
}

#[derive(Debug, Clone, Copy, ValueEnum)]
pub enum Format {
    Human,
    Json,
}
