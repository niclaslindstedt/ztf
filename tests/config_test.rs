use ztest::config;

#[test]
fn parses_full_scenario() {
    let toml = r#"
[setup]
commands = ["mkdir -p $ZTEST_TMP/work"]

[teardown]
commands = ["rm -rf $ZTEST_TMP/work"]

[[scenario]]
name = "hello"

  [scenario.arrange]
  commands = ["echo 'alice' > $ZTEST_TMP/name.txt"]

  [scenario.act]
  command = "cat $ZTEST_TMP/name.txt"

  [scenario.assert]
  exit_code = 0
  stdout_contains = ["alice"]
  stderr_contains = []
  file_exists = ["$ZTEST_TMP/name.txt"]
  file_contains = [{ path = "$ZTEST_TMP/name.txt", contains = "alice" }]

  [scenario.agent_review]
  prompt = "Did it greet nicely?"
"#;

    let parsed = config::parse(toml).expect("parse");
    let setup = parsed.setup.as_ref().expect("setup present");
    assert_eq!(setup.commands.len(), 1);
    assert_eq!(parsed.scenarios.len(), 1);
    let s = &parsed.scenarios[0];
    assert_eq!(s.name, "hello");
    assert_eq!(s.act.command, "cat $ZTEST_TMP/name.txt");
    let asserts = s.asserts.as_ref().expect("asserts present");
    assert_eq!(asserts.exit_code, Some(0));
    assert_eq!(asserts.stdout_contains, vec!["alice".to_string()]);
    assert_eq!(asserts.file_contains.len(), 1);
    assert_eq!(asserts.file_contains[0].contains, "alice");
    assert!(s.agent_review.is_some());
}

#[test]
fn act_stdin_field_parses() {
    let toml = r#"
[[scenario]]
name = "reads stdin"

  [scenario.act]
  command = "cat"
  stdin   = "alice\n"
"#;
    let parsed = config::parse(toml).expect("parse");
    assert_eq!(
        parsed.scenarios[0].act.stdin.as_deref(),
        Some("alice\n"),
        "stdin should deserialise verbatim"
    );
}

#[test]
fn act_stdin_defaults_to_none() {
    let toml = r#"
[[scenario]]
name = "no stdin"

  [scenario.act]
  command = "true"
"#;
    let parsed = config::parse(toml).expect("parse");
    assert!(parsed.scenarios[0].act.stdin.is_none());
}

#[test]
fn act_stdin_multiline_preserves_newlines() {
    let toml = "
[[scenario]]
name = \"multi\"

  [scenario.act]
  command = \"cat\"
  stdin   = \"\"\"line one
line two
\"\"\"
";
    let parsed = config::parse(toml).expect("parse");
    assert_eq!(
        parsed.scenarios[0].act.stdin.as_deref(),
        Some("line one\nline two\n")
    );
}

#[test]
fn scenario_without_asserts_or_agent_parses() {
    let toml = r#"
[[scenario]]
name = "smoke"

  [scenario.act]
  command = "true"
"#;
    let parsed = config::parse(toml).expect("parse");
    assert_eq!(parsed.scenarios.len(), 1);
    assert!(parsed.scenarios[0].asserts.is_none());
    assert!(parsed.scenarios[0].agent_review.is_none());
}

#[test]
fn empty_file_yields_empty_testfile() {
    let parsed = config::parse("").expect("parse");
    assert!(parsed.scenarios.is_empty());
    assert!(parsed.setup.is_none());
    assert!(parsed.teardown.is_none());
}
