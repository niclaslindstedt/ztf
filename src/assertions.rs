use crate::config::Assert;
use crate::shell::CmdOutput;
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
pub struct AssertionResult {
    pub kind: String,
    pub passed: bool,
    pub detail: String,
}

pub fn evaluate(
    asserts: &Assert,
    act: &CmdOutput,
    cwd: &Path,
    env: &HashMap<String, String>,
) -> Vec<AssertionResult> {
    let mut results = Vec::new();

    if let Some(expected) = asserts.exit_code {
        let passed = act.exit_code == expected;
        results.push(AssertionResult {
            kind: "exit_code".into(),
            passed,
            detail: format!("expected {expected}, got {}", act.exit_code),
        });
    }

    for needle in &asserts.stdout_contains {
        let passed = act.stdout.contains(needle);
        results.push(AssertionResult {
            kind: "stdout_contains".into(),
            passed,
            detail: format!("needle={needle:?}"),
        });
    }

    for needle in &asserts.stderr_contains {
        let passed = act.stderr.contains(needle);
        results.push(AssertionResult {
            kind: "stderr_contains".into(),
            passed,
            detail: format!("needle={needle:?}"),
        });
    }

    for raw in &asserts.file_exists {
        let path = resolve(raw, cwd, env);
        let passed = path.exists();
        results.push(AssertionResult {
            kind: "file_exists".into(),
            passed,
            detail: format!("path={}", path.display()),
        });
    }

    for fc in &asserts.file_contains {
        let path = resolve(&fc.path, cwd, env);
        let (passed, detail) = match std::fs::read_to_string(&path) {
            Ok(content) => (
                content.contains(&fc.contains),
                format!("path={}, needle={:?}", path.display(), fc.contains),
            ),
            Err(e) => (false, format!("path={}: read error: {e}", path.display())),
        };
        results.push(AssertionResult {
            kind: "file_contains".into(),
            passed,
            detail,
        });
    }

    results
}

/// Expand `$VAR` and `${VAR}` references using the provided env map, then
/// resolve relative paths against `cwd`.
pub fn resolve(raw: &str, cwd: &Path, env: &HashMap<String, String>) -> PathBuf {
    let expanded = expand_env(raw, env);
    let p = PathBuf::from(&expanded);
    if p.is_absolute() { p } else { cwd.join(p) }
}

fn expand_env(input: &str, env: &HashMap<String, String>) -> String {
    let mut out = String::with_capacity(input.len());
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'$' && i + 1 < bytes.len() {
            if bytes[i + 1] == b'{' {
                if let Some(end) = input[i + 2..].find('}') {
                    let name = &input[i + 2..i + 2 + end];
                    if let Some(v) = env.get(name) {
                        out.push_str(v);
                    }
                    i += 2 + end + 1;
                    continue;
                }
            } else {
                let start = i + 1;
                let mut j = start;
                while j < bytes.len() && (bytes[j].is_ascii_alphanumeric() || bytes[j] == b'_') {
                    j += 1;
                }
                if j > start {
                    let name = &input[start..j];
                    if let Some(v) = env.get(name) {
                        out.push_str(v);
                    }
                    i = j;
                    continue;
                }
            }
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}
