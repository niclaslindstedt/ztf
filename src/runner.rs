use crate::agent::{self, VerifyContext};
use crate::assertions;
use crate::cli::PathSpec;
use crate::config::{self, Scenario, TestFile};
use crate::report::{FileReport, Report, ScenarioResult};
use crate::shell::{self, CmdOutput};
use anyhow::{Result, anyhow};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

pub async fn run(specs: &[PathSpec]) -> Result<Report> {
    let targets = discover(specs)?;
    let mut reports = Vec::with_capacity(targets.len());
    for (path, filter) in targets {
        let test_file = config::load(&path)?;
        let fr = run_file(&path, &test_file, filter.as_deref()).await;
        reports.push(fr);
    }
    Ok(Report::new(reports))
}

async fn run_file(path: &Path, file: &TestFile, filter: Option<&str>) -> FileReport {
    if let Some(name) = filter
        && !file.scenarios.iter().any(|s| s.name == name)
    {
        return FileReport {
            path: path.to_path_buf(),
            scenarios: Vec::new(),
            setup_error: None,
            teardown_error: None,
            filter_error: Some(format!("no scenario named '{name}'")),
        };
    }

    let tmp = match TempDir::new() {
        Ok(t) => t,
        Err(e) => {
            return FileReport {
                path: path.to_path_buf(),
                scenarios: Vec::new(),
                setup_error: Some(format!("tempdir creation failed: {e}")),
                teardown_error: None,
                filter_error: None,
            };
        }
    };
    let cwd = tmp.path().to_path_buf();
    let mut env = HashMap::new();
    env.insert("ZTF_TMP".into(), cwd.display().to_string());

    let mut setup_error = None;
    if let Some(setup) = &file.setup {
        for cmd in &setup.commands {
            match shell::run_command(cmd, &cwd, &env, None).await {
                Ok(o) if !o.success() => {
                    setup_error = Some(format_cmd_failure("setup", cmd, &o));
                    break;
                }
                Err(e) => {
                    setup_error = Some(format!("setup: {cmd}: {e}"));
                    break;
                }
                Ok(_) => {}
            }
        }
    }

    let mut scenarios = Vec::new();
    if setup_error.is_none() {
        for scenario in &file.scenarios {
            if let Some(name) = filter
                && scenario.name != name
            {
                continue;
            }
            scenarios.push(run_scenario(scenario, &cwd, &env).await);
        }
    }

    let mut teardown_error = None;
    if let Some(teardown) = &file.teardown {
        for cmd in &teardown.commands {
            if let Ok(o) = shell::run_command(cmd, &cwd, &env, None).await
                && !o.success()
            {
                teardown_error = Some(format_cmd_failure("teardown", cmd, &o));
                break;
            }
        }
    }

    FileReport {
        path: path.to_path_buf(),
        scenarios,
        setup_error,
        teardown_error,
        filter_error: None,
    }
}

async fn run_scenario(
    scenario: &Scenario,
    cwd: &Path,
    env: &HashMap<String, String>,
) -> ScenarioResult {
    if let Some(arrange) = &scenario.arrange {
        for cmd in &arrange.commands {
            match shell::run_command(cmd, cwd, env, None).await {
                Ok(o) if !o.success() => {
                    return ScenarioResult {
                        name: scenario.name.clone(),
                        passed: false,
                        assertions: Vec::new(),
                        agent: None,
                        error: Some(format_cmd_failure("arrange", cmd, &o)),
                    };
                }
                Err(e) => {
                    return ScenarioResult {
                        name: scenario.name.clone(),
                        passed: false,
                        assertions: Vec::new(),
                        agent: None,
                        error: Some(format!("arrange: {cmd}: {e}")),
                    };
                }
                Ok(_) => {}
            }
        }
    }

    let act_output = match shell::run_command(
        &scenario.act.command,
        cwd,
        env,
        scenario.act.stdin.as_deref(),
    )
    .await
    {
        Ok(o) => o,
        Err(e) => {
            return ScenarioResult {
                name: scenario.name.clone(),
                passed: false,
                assertions: Vec::new(),
                agent: None,
                error: Some(format!("act: {}: {e}", scenario.act.command)),
            };
        }
    };

    let assertions = match &scenario.asserts {
        Some(a) => assertions::evaluate(a, &act_output, cwd, env),
        None => Vec::new(),
    };
    let asserts_passed = assertions.iter().all(|a| a.passed);

    let agent_verdict = if asserts_passed {
        if let Some(review) = &scenario.agent_review {
            Some(
                agent::verify(
                    review,
                    VerifyContext {
                        scenario_name: &scenario.name,
                        act_command: &scenario.act.command,
                        act_output: &act_output,
                    },
                )
                .await,
            )
        } else {
            None
        }
    } else {
        None
    };

    let agent_passed = agent_verdict.as_ref().map(|v| v.passed).unwrap_or(true);

    ScenarioResult {
        name: scenario.name.clone(),
        passed: asserts_passed && agent_passed,
        assertions,
        agent: agent_verdict,
        error: None,
    }
}

fn format_cmd_failure(stage: &str, cmd: &str, o: &CmdOutput) -> String {
    format!(
        "{stage}: `{cmd}` exited {} (stderr: {})",
        o.exit_code,
        o.stderr.trim()
    )
}

/// Resolve a list of `PathSpec`s into concrete `(file, scenario_filter)` pairs.
///
/// Expands directories to `.toml` files recursively. A `::scenario` filter is
/// only valid when the path refers to a single file, since scenario names are
/// not globally unique across files.
fn discover(specs: &[PathSpec]) -> Result<Vec<(PathBuf, Option<String>)>> {
    let mut out = Vec::new();
    for spec in specs {
        if spec.path.is_dir() {
            if spec.scenario.is_some() {
                return Err(anyhow!(
                    "scenario filter '{}' is only valid on a .toml file, not directory '{}'",
                    spec.scenario.as_deref().unwrap_or(""),
                    spec.path.display()
                ));
            }
            let mut files = Vec::new();
            collect_dir(&spec.path, &mut files)?;
            files.sort();
            for f in files {
                out.push((f, None));
            }
        } else {
            out.push((spec.path.clone(), spec.scenario.clone()));
        }
    }
    Ok(out)
}

fn collect_dir(dir: &Path, out: &mut Vec<PathBuf>) -> Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_dir(&path, out)?;
        } else if path.extension().and_then(|s| s.to_str()) == Some("toml") {
            out.push(path);
        }
    }
    Ok(())
}
