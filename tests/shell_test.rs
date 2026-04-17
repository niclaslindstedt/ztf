//! Exercise `shell::run_command` directly, including the new stdin parameter.
use std::collections::HashMap;
use tempfile::TempDir;
use ztest::shell::run_command;

fn env_with_tmp(tmp: &TempDir) -> HashMap<String, String> {
    let mut env = HashMap::new();
    env.insert("ZTEST_TMP".into(), tmp.path().display().to_string());
    env
}

#[tokio::test]
async fn none_stdin_behaves_as_null_input() {
    let tmp = TempDir::new().unwrap();
    let env = env_with_tmp(&tmp);
    // `cat` with no stdin pipe reads from /dev/null and exits cleanly with no output.
    let out = run_command("cat", tmp.path(), &env, None).await.unwrap();
    assert!(
        out.success(),
        "exit={} stderr={}",
        out.exit_code,
        out.stderr
    );
    assert_eq!(out.stdout, "");
}

#[tokio::test]
async fn stdin_is_echoed_by_cat() {
    let tmp = TempDir::new().unwrap();
    let env = env_with_tmp(&tmp);
    let out = run_command("cat", tmp.path(), &env, Some("hello"))
        .await
        .unwrap();
    assert!(out.success());
    assert_eq!(out.stdout, "hello");
}

#[tokio::test]
async fn empty_stdin_closes_pipe_without_hanging() {
    let tmp = TempDir::new().unwrap();
    let env = env_with_tmp(&tmp);
    // `cat` with an empty pipe reads EOF immediately and exits 0, proving the
    // `Some("")` path closes stdin instead of blocking. Portable across BSD
    // and GNU userlands (unlike `head -c 0`, which BSD head rejects).
    let out = run_command("cat && printf done", tmp.path(), &env, Some(""))
        .await
        .unwrap();
    assert!(out.success(), "exit={} stderr={}", out.exit_code, out.stderr);
    assert_eq!(out.stdout, "done");
}

#[tokio::test]
async fn stdin_reaches_read_builtin() {
    let tmp = TempDir::new().unwrap();
    let env = env_with_tmp(&tmp);
    let out = run_command(
        "read -r x && printf 'got:%s' \"$x\"",
        tmp.path(),
        &env,
        Some("alice\n"),
    )
    .await
    .unwrap();
    assert!(out.success(), "stderr: {}", out.stderr);
    assert_eq!(out.stdout, "got:alice");
}

#[tokio::test]
async fn non_zero_exit_is_captured() {
    let tmp = TempDir::new().unwrap();
    let env = env_with_tmp(&tmp);
    let out = run_command("false", tmp.path(), &env, None).await.unwrap();
    assert!(!out.success());
    assert_eq!(out.exit_code, 1);
}
