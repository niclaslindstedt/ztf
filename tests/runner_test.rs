//! End-to-end runner tests that omit `agent_review` (no network calls).
use std::path::{Path, PathBuf};
use std::str::FromStr;
use tempfile::TempDir;
use ztest::cli::PathSpec;

fn write_scenario(dir: &Path, name: &str, body: &str) -> PathBuf {
    let path = dir.join(name);
    std::fs::write(&path, body).unwrap();
    path
}

fn spec(path: PathBuf) -> PathSpec {
    PathSpec {
        path,
        scenario: None,
    }
}

fn spec_with(path: PathBuf, scenario: &str) -> PathSpec {
    PathSpec {
        path,
        scenario: Some(scenario.to_string()),
    }
}

#[tokio::test]
async fn passing_scenario_reports_pass() {
    let tmp = TempDir::new().unwrap();
    let path = write_scenario(
        tmp.path(),
        "ok.toml",
        r#"
[[scenario]]
name = "writes a file"

  [scenario.arrange]
  commands = ["echo 'alice' > $ZTEST_TMP/name.txt"]

  [scenario.act]
  command = "cat $ZTEST_TMP/name.txt"

  [scenario.assert]
  exit_code = 0
  stdout_contains = ["alice"]
  file_exists = ["$ZTEST_TMP/name.txt"]
"#,
    );
    let report = ztest::run(&[spec(path)]).await.unwrap();
    assert_eq!(report.summary.total, 1);
    assert_eq!(report.summary.passed, 1);
    assert!(report.all_passed());
}

#[tokio::test]
async fn failing_assertion_reports_fail() {
    let tmp = TempDir::new().unwrap();
    let path = write_scenario(
        tmp.path(),
        "bad.toml",
        r#"
[[scenario]]
name = "wrong expectation"

  [scenario.act]
  command = "printf goodbye"

  [scenario.assert]
  stdout_contains = ["hello"]
"#,
    );
    let report = ztest::run(&[spec(path)]).await.unwrap();
    assert_eq!(report.summary.failed, 1);
    assert!(!report.all_passed());
    let sr = &report.files[0].scenarios[0];
    assert!(!sr.passed);
    assert!(sr.assertions.iter().any(|a| !a.passed));
    assert!(sr.agent.is_none(), "agent must not run on failed asserts");
}

#[tokio::test]
async fn failing_command_reports_error_without_agent() {
    let tmp = TempDir::new().unwrap();
    let path = write_scenario(
        tmp.path(),
        "cmd_err.toml",
        r#"
[[scenario]]
name = "bogus command"

  [scenario.act]
  command = "false"

  [scenario.assert]
  exit_code = 0

  [scenario.agent_review]
  prompt = "should not be called"
"#,
    );
    let report = ztest::run(&[spec(path)]).await.unwrap();
    assert_eq!(report.summary.failed, 1);
    let sr = &report.files[0].scenarios[0];
    assert!(sr.agent.is_none(), "agent must not run when asserts fail");
}

#[tokio::test]
async fn directory_discovery_picks_up_toml_files() {
    let tmp = TempDir::new().unwrap();
    write_scenario(
        tmp.path(),
        "a.toml",
        r#"
[[scenario]]
name = "a"
  [scenario.act]
  command = "true"
  [scenario.assert]
  exit_code = 0
"#,
    );
    write_scenario(
        tmp.path(),
        "b.toml",
        r#"
[[scenario]]
name = "b"
  [scenario.act]
  command = "true"
  [scenario.assert]
  exit_code = 0
"#,
    );
    let report = ztest::run(&[spec(tmp.path().to_path_buf())]).await.unwrap();
    assert_eq!(report.summary.total, 2);
    assert_eq!(report.summary.passed, 2);
}

#[tokio::test]
async fn scenario_filter_runs_only_matching_scenario() {
    let tmp = TempDir::new().unwrap();
    let path = write_scenario(
        tmp.path(),
        "multi.toml",
        r#"
[[scenario]]
name = "first"
  [scenario.act]
  command = "true"
  [scenario.assert]
  exit_code = 0

[[scenario]]
name = "second"
  [scenario.act]
  command = "true"
  [scenario.assert]
  exit_code = 0
"#,
    );
    let report = ztest::run(&[spec_with(path, "second")]).await.unwrap();
    assert_eq!(report.summary.total, 1);
    assert_eq!(report.summary.passed, 1);
    assert_eq!(report.files[0].scenarios.len(), 1);
    assert_eq!(report.files[0].scenarios[0].name, "second");
}

#[tokio::test]
async fn scenario_filter_miss_reports_filter_error() {
    let tmp = TempDir::new().unwrap();
    let path = write_scenario(
        tmp.path(),
        "miss.toml",
        r#"
[[scenario]]
name = "only one"
  [scenario.act]
  command = "true"
  [scenario.assert]
  exit_code = 0
"#,
    );
    let report = ztest::run(&[spec_with(path, "nope")]).await.unwrap();
    assert!(!report.all_passed());
    let fr = &report.files[0];
    assert!(fr.scenarios.is_empty());
    assert_eq!(fr.filter_error.as_deref(), Some("no scenario named 'nope'"));
}

#[tokio::test]
async fn scenario_filter_still_runs_setup_and_teardown() {
    let outer = TempDir::new().unwrap();
    let marker = outer.path().join("setup-ran");
    let teardown_marker = outer.path().join("teardown-ran");
    // Forward-slash paths so Git Bash on Windows doesn't eat the backslashes
    // as shell escapes; single-quoted TOML literal strings to avoid TOML's
    // own `\U` escape processing. Rust's `Path::exists` accepts either slash
    // direction on Windows, so `marker.exists()` still finds the file.
    let setup = marker.display().to_string().replace('\\', "/");
    let teardown = teardown_marker.display().to_string().replace('\\', "/");
    let toml = format!(
        r#"
[setup]
commands = ['touch {setup}']

[teardown]
commands = ['touch {teardown}']

[[scenario]]
name = "first"
  [scenario.act]
  command = "true"
  [scenario.assert]
  exit_code = 0

[[scenario]]
name = "second"
  [scenario.act]
  command = "true"
  [scenario.assert]
  exit_code = 0
"#,
    );
    let path = write_scenario(outer.path(), "st.toml", &toml);
    let report = ztest::run(&[spec_with(path, "second")]).await.unwrap();
    assert!(report.all_passed());
    assert!(marker.exists(), "setup did not run");
    assert!(teardown_marker.exists(), "teardown did not run");
}

#[tokio::test]
async fn directory_with_scenario_filter_errors() {
    let tmp = TempDir::new().unwrap();
    write_scenario(
        tmp.path(),
        "a.toml",
        r#"
[[scenario]]
name = "a"
  [scenario.act]
  command = "true"
  [scenario.assert]
  exit_code = 0
"#,
    );
    let result = ztest::run(&[spec_with(tmp.path().to_path_buf(), "a")]).await;
    assert!(result.is_err(), "filter + directory must error");
}

#[tokio::test]
async fn act_stdin_is_piped_to_command() {
    let tmp = TempDir::new().unwrap();
    let path = write_scenario(
        tmp.path(),
        "stdin.toml",
        r#"
[[scenario]]
name = "reads stdin"

  [scenario.act]
  command = "read -r x && printf 'got:%s' \"$x\""
  stdin   = "alice\n"

  [scenario.assert]
  exit_code = 0
  stdout_contains = ["got:alice"]
"#,
    );
    let report = ztest::run(&[spec(path)]).await.unwrap();
    assert!(report.all_passed(), "report: {report:?}");
}

#[tokio::test]
async fn path_spec_from_str_round_trips_via_run() {
    // Smoke-test: `PathSpec::from_str` is how clap reaches this path, so run
    // the full pipeline with a parsed spec.
    let tmp = TempDir::new().unwrap();
    let path = write_scenario(
        tmp.path(),
        "smoke.toml",
        r#"
[[scenario]]
name = "only"
  [scenario.act]
  command = "true"
  [scenario.assert]
  exit_code = 0
"#,
    );
    let input = format!("{}::only", path.display());
    let spec = PathSpec::from_str(&input).expect("parse");
    let report = ztest::run(&[spec]).await.unwrap();
    assert!(report.all_passed());
}
