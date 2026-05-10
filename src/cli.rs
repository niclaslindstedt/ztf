use clap::{Parser, Subcommand, ValueEnum};
use std::path::PathBuf;
use std::str::FromStr;

#[derive(Debug, Parser)]
#[command(
    name = "ztf",
    version,
    about = "Agent-assisted end-to-end testing",
    arg_required_else_help = true
)]
pub struct Cli {
    /// Lift debug-level output onto stderr. The persistent debug log
    /// file (`~/.local/state/ztf/debug.log` on Linux) is always
    /// written regardless of this flag — see §19.
    #[arg(long, global = true, default_value_t = false)]
    pub debug: bool,

    /// Print a self-describing prompt block agents can paste into
    /// their context to learn how to invoke `ztf`. See §12.5.
    #[arg(long, exclusive = true, conflicts_with = "debug_agent")]
    pub help_agent: bool,

    /// Print troubleshooting context (config paths, log file, env
    /// vars, common failure modes) for agents diagnosing a `ztf`
    /// problem. See §12.5.
    #[arg(long, exclusive = true)]
    pub debug_agent: bool,

    #[command(subcommand)]
    pub command: Option<Command>,
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

    /// Print a machine-readable index of every command and its
    /// flags / exit codes. See §12.5.
    Commands {
        /// Restrict the index to a single command.
        name: Option<String>,

        /// Include canonical example invocations in the output.
        #[arg(long)]
        examples: bool,
    },

    /// Print the embedded reference manpage for `<name>`. Use
    /// `ztf commands` to list available manpages. See §12.5.
    Man {
        /// Manpage name (`main`, `run`, `commands`, `man`, `docs`).
        name: String,
    },

    /// Print the embedded conceptual documentation topic for
    /// `<topic>`. Use `ztf commands` to list available topics. See
    /// §12.5.
    Docs {
        /// Topic name (`getting-started`, `configuration`,
        /// `architecture`, `troubleshooting`).
        topic: String,
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
