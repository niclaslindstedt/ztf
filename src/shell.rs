use anyhow::{Context, Result};
use std::collections::HashMap;
use std::path::Path;
use tokio::process::Command;

#[derive(Debug, Clone)]
pub struct CmdOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

impl CmdOutput {
    pub fn success(&self) -> bool {
        self.exit_code == 0
    }
}

pub async fn run_command(
    command: &str,
    cwd: &Path,
    env: &HashMap<String, String>,
) -> Result<CmdOutput> {
    let output = Command::new("sh")
        .arg("-c")
        .arg(command)
        .current_dir(cwd)
        .envs(env)
        .output()
        .await
        .with_context(|| format!("spawning `sh -c` for: {command}"))?;

    Ok(CmdOutput {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}
