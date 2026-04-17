use std::collections::HashMap;
use tempfile::TempDir;
use ztest::assertions::{self, evaluate};
use ztest::config::{Assert, FileContains};
use ztest::shell::CmdOutput;

fn sample_output() -> CmdOutput {
    CmdOutput {
        stdout: "Hello, alice\nsecond line\n".into(),
        stderr: "warning: nothing\n".into(),
        exit_code: 0,
    }
}

#[test]
fn exit_code_pass_and_fail() {
    let out = sample_output();
    let a = Assert {
        exit_code: Some(0),
        ..Default::default()
    };
    let r = evaluate(&a, &out, &std::env::temp_dir(), &HashMap::new());
    assert_eq!(r.len(), 1);
    assert!(r[0].passed);

    let a = Assert {
        exit_code: Some(42),
        ..Default::default()
    };
    let r = evaluate(&a, &out, &std::env::temp_dir(), &HashMap::new());
    assert!(!r[0].passed);
}

#[test]
fn stdout_stderr_contains() {
    let out = sample_output();
    let a = Assert {
        stdout_contains: vec!["alice".into(), "absent".into()],
        stderr_contains: vec!["warning".into()],
        ..Default::default()
    };
    let r = evaluate(&a, &out, &std::env::temp_dir(), &HashMap::new());
    let by_kind: Vec<_> = r.iter().map(|x| (x.kind.clone(), x.passed)).collect();
    assert_eq!(
        by_kind,
        vec![
            ("stdout_contains".to_string(), true),
            ("stdout_contains".to_string(), false),
            ("stderr_contains".to_string(), true),
        ]
    );
}

#[test]
fn file_exists_and_file_contains_with_env_expansion() {
    let tmp = TempDir::new().unwrap();
    let mut env = HashMap::new();
    env.insert("ZTEST_TMP".into(), tmp.path().display().to_string());

    let file = tmp.path().join("name.txt");
    std::fs::write(&file, "alice\n").unwrap();

    let a = Assert {
        file_exists: vec!["$ZTEST_TMP/name.txt".into(), "${ZTEST_TMP}/missing".into()],
        file_contains: vec![FileContains {
            path: "$ZTEST_TMP/name.txt".into(),
            contains: "alice".into(),
        }],
        ..Default::default()
    };
    let r = evaluate(&a, &sample_output(), tmp.path(), &env);
    assert_eq!(r.len(), 3);
    assert!(r[0].passed, "existing file: {}", r[0].detail);
    assert!(!r[1].passed, "missing file should fail");
    assert!(r[2].passed, "file_contains alice: {}", r[2].detail);
}

#[test]
fn relative_paths_resolve_against_cwd() {
    let tmp = TempDir::new().unwrap();
    std::fs::write(tmp.path().join("local.txt"), "hi").unwrap();
    let env = HashMap::new();
    let p = assertions::resolve("local.txt", tmp.path(), &env);
    assert!(p.exists());
}
