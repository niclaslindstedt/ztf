//! End-to-end runner tests that omit `agent_review` (no network calls).
use std::path::PathBuf;
use tempfile::TempDir;

fn write_scenario(dir: &std::path::Path, name: &str, body: &str) -> PathBuf {
    let path = dir.join(name);
    std::fs::write(&path, body).unwrap();
    path
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
    let report = ztest::run(&[path]).await.unwrap();
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
    let report = ztest::run(&[path]).await.unwrap();
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
    let report = ztest::run(&[path]).await.unwrap();
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
    let report = ztest::run(&[tmp.path().to_path_buf()]).await.unwrap();
    assert_eq!(report.summary.total, 2);
    assert_eq!(report.summary.passed, 2);
}
