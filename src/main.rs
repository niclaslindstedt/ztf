use anyhow::Result;
use clap::Parser;
use ztf::cli::{Cli, Command, Format};
use ztf::discoverability;

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    ztf::output::init(cli.debug);

    if cli.help_agent {
        discoverability::print_help_agent();
        return Ok(());
    }
    if cli.debug_agent {
        discoverability::print_debug_agent();
        return Ok(());
    }

    let Some(command) = cli.command else {
        // clap's `arg_required_else_help` would normally print --help
        // and exit before we get here; this branch only fires if the
        // user passed only a global flag like `--debug`.
        eprintln!("ztf: no subcommand given. Try `ztf --help`.");
        std::process::exit(2);
    };

    match command {
        Command::Run { paths, format } => {
            let report = ztf::run(&paths).await?;
            match format {
                Format::Human => print!("{}", report.render_human()),
                Format::Json => println!("{}", report.render_json()),
            }
            if !report.all_passed() {
                std::process::exit(1);
            }
        }
        Command::Commands { name, examples } => {
            if !discoverability::print_commands(name.as_deref(), examples) {
                eprintln!("ztf commands: unknown command name");
                std::process::exit(1);
            }
        }
        Command::Man { name } => {
            if !discoverability::print_man(&name) {
                eprintln!(
                    "ztf man: unknown manpage `{name}` (try one of: {})",
                    discoverability::MAN_NAMES.join(", ")
                );
                std::process::exit(1);
            }
        }
        Command::Docs { topic } => {
            if !discoverability::print_docs(&topic) {
                eprintln!(
                    "ztf docs: unknown topic `{topic}` (try one of: {})",
                    discoverability::DOC_TOPICS.join(", ")
                );
                std::process::exit(1);
            }
        }
    }
    Ok(())
}
