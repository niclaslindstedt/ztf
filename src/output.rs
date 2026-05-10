//! Central output module for user-facing diagnostic messages.
//!
//! Per §19.4 of `OSS_SPEC.md`, all non-contractual user-facing output
//! must route through these semantic helpers. The CLI's report
//! rendering on stdout (both `--format human` and `--format json`) is
//! a contractual machine-readable surface and is therefore exempt;
//! everything else — progress, warnings, errors, headers — should go
//! through the helpers below so styling and routing stay consistent.
//!
//! All helpers write to stderr to keep stdout reserved for the
//! report contract. ANSI styling is suppressed when stderr is not a
//! terminal or when `NO_COLOR` is set in the environment (per
//! <https://no-color.org/>).
//!
//! There is no separate log file or logging framework wired up yet;
//! when one is introduced, mirror each helper's message to it from
//! here so call sites do not have to change.

use std::io::{IsTerminal, Write};

const RESET: &str = "\x1b[0m";
const BOLD: &str = "\x1b[1m";
const GREEN: &str = "\x1b[32m";
const YELLOW: &str = "\x1b[33m";
const BLUE: &str = "\x1b[34m";
const RED: &str = "\x1b[31m";

fn use_color() -> bool {
    if std::env::var_os("NO_COLOR").is_some() {
        return false;
    }
    std::io::stderr().is_terminal()
}

fn emit(prefix_color: &str, prefix: &str, msg: &str) {
    let mut err = std::io::stderr().lock();
    let _ = if use_color() {
        writeln!(err, "{prefix_color}{prefix}{RESET} {msg}")
    } else {
        writeln!(err, "{prefix} {msg}")
    };
}

/// Success / completion message (e.g. "scenario passed").
pub fn status(msg: &str) {
    emit(GREEN, "✓", msg);
}

/// Warning — something the user should notice but execution continues.
pub fn warn(msg: &str) {
    emit(YELLOW, "!", msg);
}

/// Informational message.
pub fn info(msg: &str) {
    emit(BLUE, "·", msg);
}

/// Bold section header.
pub fn header(msg: &str) {
    let mut err = std::io::stderr().lock();
    let _ = if use_color() {
        writeln!(err, "{BOLD}{msg}{RESET}")
    } else {
        writeln!(err, "{msg}")
    };
}

/// Error message — the action failed.
pub fn error(msg: &str) {
    emit(RED, "✗", msg);
}
