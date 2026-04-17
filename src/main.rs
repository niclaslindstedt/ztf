use anyhow::Result;
use clap::Parser;
use ztest::cli::{Cli, Command, Format};

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::Run { paths, format } => {
            let report = ztest::run(&paths).await?;
            match format {
                Format::Human => print!("{}", report.render_human()),
                Format::Json => println!("{}", report.render_json()),
            }
            if !report.all_passed() {
                std::process::exit(1);
            }
        }
    }
    Ok(())
}
