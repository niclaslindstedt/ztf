//! Central output module for user-facing diagnostic messages (§19).
//!
//! Every helper writes to **both** the terminal (stderr, styled when
//! the stream is a TTY and `NO_COLOR` is unset) and a persistent
//! debug log file. The log file is always-on; the `--debug` flag
//! controls whether `debug` messages are also lifted onto stderr.
//!
//! Raw `println!` / `eprintln!` calls are forbidden outside this
//! module except for machine-readable contractual output (the report
//! format on stdout, see §19.4).
//!
//! Stdout is reserved for the report contract — all helpers below
//! write to stderr so piping `ztf` output never corrupts the JSON or
//! human report.

use std::fs::{File, OpenOptions, create_dir_all};
use std::io::{IsTerminal, Write};
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

const RESET: &str = "\x1b[0m";
const BOLD: &str = "\x1b[1m";
const DIM: &str = "\x1b[2m";
const GREEN: &str = "\x1b[32m";
const YELLOW: &str = "\x1b[33m";
const BLUE: &str = "\x1b[34m";
const RED: &str = "\x1b[31m";

#[derive(Default)]
struct State {
    debug: bool,
    log: Option<Mutex<File>>,
}

static STATE: OnceLock<State> = OnceLock::new();

/// Initialise the output module. Call this once from `main` before
/// any helpers fire. Safe to call multiple times — only the first
/// call wins.
pub fn init(debug: bool) {
    let log = open_log_file();
    let _ = STATE.set(State {
        debug,
        log: log.map(Mutex::new),
    });
}

/// Returns the platform-appropriate path for the always-on debug log
/// (`~/.local/state/ztf/debug.log` on Linux). Public so test code can
/// inspect it.
pub fn log_path() -> Option<PathBuf> {
    if let Ok(override_path) = std::env::var("ZTF_LOG_FILE") {
        return Some(PathBuf::from(override_path));
    }
    let base = dirs::state_dir().or_else(dirs::data_local_dir)?;
    Some(base.join("ztf").join("debug.log"))
}

fn open_log_file() -> Option<File> {
    let path = log_path()?;
    if let Some(parent) = path.parent()
        && create_dir_all(parent).is_err()
    {
        return None;
    }
    OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .ok()
}

fn state() -> &'static State {
    STATE.get_or_init(|| State {
        debug: false,
        log: open_log_file().map(Mutex::new),
    })
}

fn use_color() -> bool {
    if std::env::var_os("NO_COLOR").is_some() {
        return false;
    }
    std::io::stderr().is_terminal()
}

fn write_log(level: &str, msg: &str) {
    let Some(file) = state().log.as_ref() else {
        return;
    };
    let Ok(mut guard) = file.lock() else { return };
    let ts = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S%.3f%z");
    let _ = writeln!(*guard, "{ts} {level:<5} {msg}");
}

fn emit(level: &str, prefix_color: &str, prefix: &str, msg: &str) {
    let mut err = std::io::stderr().lock();
    let _ = if use_color() {
        writeln!(err, "{prefix_color}{prefix}{RESET} {msg}")
    } else {
        writeln!(err, "{prefix} {msg}")
    };
    write_log(level, msg);
}

/// Success / completion message (e.g. "scenario passed").
pub fn status(msg: &str) {
    emit("INFO", GREEN, "✓", msg);
}

/// Warning — something the user should notice but execution continues.
pub fn warn(msg: &str) {
    emit("WARN", YELLOW, "!", msg);
}

/// Informational message.
pub fn info(msg: &str) {
    emit("INFO", BLUE, "·", msg);
}

/// Bold section header.
pub fn header(msg: &str) {
    let mut err = std::io::stderr().lock();
    let _ = if use_color() {
        writeln!(err, "{BOLD}{msg}{RESET}")
    } else {
        writeln!(err, "{msg}")
    };
    write_log("INFO", msg);
}

/// Error message — the action failed.
pub fn error(msg: &str) {
    emit("ERROR", RED, "✗", msg);
}

/// Debug message. Always written to the log file; only echoed to
/// stderr when `--debug` was passed (see `init`).
pub fn debug(msg: &str) {
    if state().debug {
        let mut err = std::io::stderr().lock();
        let _ = if use_color() {
            writeln!(err, "{DIM}debug: {msg}{RESET}")
        } else {
            writeln!(err, "debug: {msg}")
        };
    }
    write_log("DEBUG", msg);
}
