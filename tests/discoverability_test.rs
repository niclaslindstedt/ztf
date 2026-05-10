//! Snapshot and parity tests for the §12.5 discoverability surfaces.
//!
//! - `--help-agent` and `--debug-agent` must emit the embedded
//!   `agent-help/*.md` content verbatim. The snapshot prevents
//!   accidental drift between the file and the binary.
//! - The `Flags` table in each manpage must match the flags clap
//!   exposes for that command (parity check).

use clap::CommandFactory;
use std::collections::BTreeSet;
use std::process::Command;

const HELP_AGENT_SRC: &str = include_str!("../agent-help/help.md");
const DEBUG_AGENT_SRC: &str = include_str!("../agent-help/debug.md");

fn run_ztf(args: &[&str]) -> String {
    let exe = env!("CARGO_BIN_EXE_ztf");
    let output = Command::new(exe)
        .args(args)
        .output()
        .expect("failed to invoke ztf binary");
    assert!(
        output.status.success(),
        "ztf {args:?} exited with {} (stderr: {})",
        output.status,
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8(output.stdout).expect("stdout was not UTF-8")
}

#[test]
fn help_agent_matches_source_file() {
    let out = run_ztf(&["--help-agent"]);
    assert_eq!(out, HELP_AGENT_SRC);
}

#[test]
fn debug_agent_matches_source_file() {
    let out = run_ztf(&["--debug-agent"]);
    assert_eq!(out, DEBUG_AGENT_SRC);
}

#[test]
fn man_main_renders_a_manpage_heading() {
    let out = run_ztf(&["man", "main"]);
    assert!(
        out.starts_with("# ztf"),
        "missing top-level heading: {out:?}"
    );
}

#[test]
fn unknown_man_name_exits_nonzero() {
    let exe = env!("CARGO_BIN_EXE_ztf");
    let out = Command::new(exe)
        .args(["man", "nope"])
        .output()
        .expect("failed to invoke ztf binary");
    assert!(!out.status.success());
}

#[test]
fn unknown_docs_topic_exits_nonzero() {
    let exe = env!("CARGO_BIN_EXE_ztf");
    let out = Command::new(exe)
        .args(["docs", "no-such-topic"])
        .output()
        .expect("failed to invoke ztf binary");
    assert!(!out.status.success());
}

#[test]
fn commands_index_includes_every_subcommand() {
    let out = run_ztf(&["commands"]);
    let json: serde_json::Value = serde_json::from_str(&out).expect("commands output is JSON");
    let names: Vec<&str> = json["commands"]
        .as_array()
        .unwrap()
        .iter()
        .map(|c| c["name"].as_str().unwrap())
        .collect();
    for expected in ["run", "commands", "man", "docs"] {
        assert!(names.contains(&expected), "missing command `{expected}`");
    }
}

#[test]
fn commands_examples_flag_includes_examples_field() {
    let with = run_ztf(&["commands", "--examples"]);
    let with_json: serde_json::Value = serde_json::from_str(&with).unwrap();
    assert!(with_json["commands"][0].get("examples").is_some());

    let without = run_ztf(&["commands"]);
    let without_json: serde_json::Value = serde_json::from_str(&without).unwrap();
    assert!(without_json["commands"][0].get("examples").is_none());
}

/// `--help` and `--version` are injected by clap at parse time, not
/// declared as `Arg`s. They appear in every manpage's Flags table for
/// completeness; ignore them for the parity check.
const CLAP_BUILTINS: &[&str] = &["help", "version"];

fn assert_manpage_flags_match_clap(subcommand: &str, manpage: &str) {
    let manpage_flags = parse_flags_table(manpage);
    let clap_flags = clap_flags_for(subcommand);
    for f in &manpage_flags {
        if CLAP_BUILTINS.contains(&f.as_str()) {
            continue;
        }
        assert!(
            clap_flags.contains(f),
            "manpage lists `--{f}` but clap does not expose it on `{subcommand}`. \
             clap flags: {clap_flags:?}"
        );
    }
}

#[test]
fn manpage_flags_match_clap_for_run_subcommand() {
    assert_manpage_flags_match_clap("run", include_str!("../man/run.md"));
}

#[test]
fn manpage_flags_match_clap_for_commands_subcommand() {
    assert_manpage_flags_match_clap("commands", include_str!("../man/commands.md"));
}

#[test]
fn manpage_flags_match_clap_for_man_subcommand() {
    assert_manpage_flags_match_clap("man", include_str!("../man/man.md"));
}

#[test]
fn manpage_flags_match_clap_for_docs_subcommand() {
    assert_manpage_flags_match_clap("docs", include_str!("../man/docs.md"));
}

fn parse_flags_table(md: &str) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    let mut in_flags_section = false;
    for line in md.lines() {
        if line.trim_start().starts_with("## ") {
            in_flags_section = line.trim() == "## Flags";
            continue;
        }
        if !in_flags_section {
            continue;
        }
        // Look for `--flag-name` inside the row, before the second `|`.
        if let Some(rest) = line.strip_prefix("| `") {
            if let Some(end) = rest.find('`') {
                let token = &rest[..end];
                if let Some(stripped) = token.strip_prefix("--") {
                    let name = stripped
                        .split_whitespace()
                        .next()
                        .unwrap_or(stripped)
                        .to_string();
                    out.insert(name);
                }
            }
        }
    }
    out
}

fn clap_flags_for(subcommand: &str) -> BTreeSet<String> {
    let mut cmd = ztf::cli::Cli::command();
    let sub = cmd
        .find_subcommand_mut(subcommand)
        .unwrap_or_else(|| panic!("clap has no subcommand `{subcommand}`"));
    let mut out = BTreeSet::new();
    for arg in sub.get_arguments() {
        if let Some(long) = arg.get_long() {
            out.insert(long.to_string());
        }
    }
    // Inherited globals from the top-level Cli (e.g. --debug).
    for arg in cmd.get_arguments() {
        if arg.is_global_set()
            && let Some(long) = arg.get_long()
        {
            out.insert(long.to_string());
        }
    }
    out
}
