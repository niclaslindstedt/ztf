use anyhow::{Context, Result};
use std::collections::HashMap;
use std::path::Path;
use std::process::Stdio;
use tokio::io::AsyncWriteExt;
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
    stdin: Option<&str>,
) -> Result<CmdOutput> {
    let mut cmd = Command::new("sh");
    cmd.arg("-c")
        .arg(command)
        .current_dir(cwd)
        .envs(env)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(if stdin.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        });

    let mut child = cmd
        .spawn()
        .with_context(|| format!("spawning `sh -c` for: {command}"))?;

    if let Some(input) = stdin {
        let mut handle = child
            .stdin
            .take()
            .expect("stdin pipe was configured but is missing");
        handle
            .write_all(input.as_bytes())
            .await
            .with_context(|| format!("writing stdin for: {command}"))?;
        drop(handle);
    }

    let output = child
        .wait_with_output()
        .await
        .with_context(|| format!("awaiting output for: {command}"))?;

    Ok(CmdOutput {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}
