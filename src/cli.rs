use clap::{Parser, Subcommand, ValueEnum};
use std::path::PathBuf;
use std::str::FromStr;

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
        /// Append `::<scenario>` to a file path to run only the named scenario.
        #[arg(required = true)]
        paths: Vec<PathSpec>,

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

/// A path argument, optionally narrowed to a single scenario with `::name`.
///
/// Splitting uses the **first** `::` so scenario names may contain `::`.
/// Paths containing `::` are not supported.
#[derive(Debug, Clone)]
pub struct PathSpec {
    pub path: PathBuf,
    pub scenario: Option<String>,
}

impl FromStr for PathSpec {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.split_once("::") {
            None => Ok(PathSpec {
                path: PathBuf::from(s),
                scenario: None,
            }),
            Some((_, "")) => Err(format!(
                "scenario filter is empty in `{s}` (expected `path::scenario`)"
            )),
            Some(("", _)) => Err(format!(
                "path is empty in `{s}` (expected `path::scenario`)"
            )),
            Some((path, scenario)) => Ok(PathSpec {
                path: PathBuf::from(path),
                scenario: Some(scenario.to_string()),
            }),
        }
    }
}
