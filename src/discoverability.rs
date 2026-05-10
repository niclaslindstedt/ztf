//! CLI discoverability surfaces (§12.5 of `OSS_SPEC.md`).
//!
//! Implements the eight agent-facing surfaces the spec mandates for
//! every CLI:
//!
//! - `ztf --help-agent` — self-describing prompt block
//! - `ztf --debug-agent` — troubleshooting context
//! - `ztf commands` — machine-readable command index
//! - `ztf commands <name>` — single-command spec
//! - `ztf commands --examples` — example invocations, all
//! - `ztf commands <name> --examples` — examples for one
//! - `ztf man <name>` — embedded reference manpage
//! - `ztf docs <topic>` — embedded topic doc
//!
//! All output goes to stdout in plain ASCII / UTF-8 with no ANSI
//! escapes — these are machine-readable contractual surfaces and the
//! §19.4 carve-out for raw print statements applies.

use serde_json::json;

const HELP_AGENT: &str = include_str!("../agent-help/help.md");
const DEBUG_AGENT: &str = include_str!("../agent-help/debug.md");

const MAN_MAIN: &str = include_str!("../man/main.md");
const MAN_RUN: &str = include_str!("../man/run.md");
const MAN_COMMANDS: &str = include_str!("../man/commands.md");
const MAN_MAN: &str = include_str!("../man/man.md");
const MAN_DOCS: &str = include_str!("../man/docs.md");

const DOC_GETTING_STARTED: &str = include_str!("../docs/getting-started.md");
const DOC_CONFIGURATION: &str = include_str!("../docs/configuration.md");
const DOC_ARCHITECTURE: &str = include_str!("../docs/architecture.md");
const DOC_TROUBLESHOOTING: &str = include_str!("../docs/troubleshooting.md");

/// Names of every embedded manpage, in canonical display order.
pub const MAN_NAMES: &[&str] = &["main", "run", "commands", "man", "docs"];

/// Names of every embedded docs topic.
pub const DOC_TOPICS: &[&str] = &[
    "getting-started",
    "configuration",
    "architecture",
    "troubleshooting",
];

pub fn print_help_agent() {
    print!("{HELP_AGENT}");
}

pub fn print_debug_agent() {
    print!("{DEBUG_AGENT}");
}

/// Emit the JSON command index. With `name` set, restrict to a
/// single command. Returns `false` if the requested name is unknown.
#[must_use]
pub fn print_commands(name: Option<&str>, examples: bool) -> bool {
    let mut commands = command_index();
    if let Some(want) = name {
        commands.retain(|c| c["name"] == *want);
        if commands.is_empty() {
            return false;
        }
    }
    if !examples {
        for cmd in &mut commands {
            if let Some(obj) = cmd.as_object_mut() {
                obj.remove("examples");
            }
        }
    }
    let payload = json!({ "commands": commands });
    println!("{}", serde_json::to_string_pretty(&payload).unwrap());
    true
}

/// Print the embedded manpage for `name`. Returns `false` if unknown.
#[must_use]
pub fn print_man(name: &str) -> bool {
    let body = match name {
        "main" => MAN_MAIN,
        "run" => MAN_RUN,
        "commands" => MAN_COMMANDS,
        "man" => MAN_MAN,
        "docs" => MAN_DOCS,
        _ => return false,
    };
    print!("{body}");
    true
}

/// Print the embedded docs topic for `topic`. Returns `false` if unknown.
#[must_use]
pub fn print_docs(topic: &str) -> bool {
    let body = match topic {
        "getting-started" => DOC_GETTING_STARTED,
        "configuration" => DOC_CONFIGURATION,
        "architecture" => DOC_ARCHITECTURE,
        "troubleshooting" => DOC_TROUBLESHOOTING,
        _ => return false,
    };
    print!("{body}");
    true
}

fn command_index() -> Vec<serde_json::Value> {
    vec![
        json!({
            "name": "run",
            "summary": "Run scenarios from one or more TOML files or directories.",
            "flags": [
                {"name": "--format", "type": "human|json", "default": "human", "description": "Output format."},
                {"name": "--debug", "type": "bool", "default": false, "description": "Lift debug-level output onto stderr."}
            ],
            "exit_codes": [
                {"code": 0, "meaning": "All scenarios passed."},
                {"code": 1, "meaning": "At least one scenario failed, or a ::scenario filter matched nothing."},
                {"code": 2, "meaning": "Usage error."}
            ],
            "examples": [
                "ztf run tests/smoke.toml",
                "ztf run tests/ --format=json | jq .summary",
                "ztf run 'tests/smoke.toml::greets a user by name'"
            ]
        }),
        json!({
            "name": "commands",
            "summary": "Print a machine-readable index of every command.",
            "flags": [
                {"name": "--examples", "type": "bool", "default": false, "description": "Include example invocations."},
                {"name": "--debug", "type": "bool", "default": false, "description": "Lift debug-level output onto stderr."}
            ],
            "exit_codes": [
                {"code": 0, "meaning": "Output written successfully."},
                {"code": 1, "meaning": "Unknown command name."}
            ],
            "examples": [
                "ztf commands",
                "ztf commands run",
                "ztf commands --examples"
            ]
        }),
        json!({
            "name": "man",
            "summary": "Print the embedded reference manpage for <name>.",
            "flags": [
                {"name": "--debug", "type": "bool", "default": false, "description": "Lift debug-level output onto stderr."}
            ],
            "exit_codes": [
                {"code": 0, "meaning": "Manpage printed."},
                {"code": 1, "meaning": "Unknown manpage name."}
            ],
            "examples": [
                "ztf man main",
                "ztf man run"
            ]
        }),
        json!({
            "name": "docs",
            "summary": "Print the embedded conceptual documentation topic for <topic>.",
            "flags": [
                {"name": "--debug", "type": "bool", "default": false, "description": "Lift debug-level output onto stderr."}
            ],
            "exit_codes": [
                {"code": 0, "meaning": "Topic printed."},
                {"code": 1, "meaning": "Unknown topic."}
            ],
            "examples": [
                "ztf docs getting-started",
                "ztf docs architecture"
            ]
        }),
    ]
}
