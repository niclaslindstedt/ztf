use crate::agent::AgentVerdict;
use crate::assertions::AssertionResult;
use serde::Serialize;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize)]
pub struct Report {
    pub files: Vec<FileReport>,
    pub summary: Summary,
}

#[derive(Debug, Clone, Serialize)]
pub struct FileReport {
    pub path: PathBuf,
    pub scenarios: Vec<ScenarioResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub setup_error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub teardown_error: Option<String>,
    /// Set when a `::scenario` filter matched no scenarios in this file.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filter_error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScenarioResult {
    pub name: String,
    pub passed: bool,
    pub assertions: Vec<AssertionResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent: Option<AgentVerdict>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct Summary {
    pub total: usize,
    pub passed: usize,
    pub failed: usize,
}

impl Report {
    pub fn new(files: Vec<FileReport>) -> Self {
        let mut summary = Summary::default();
        for f in &files {
            for s in &f.scenarios {
                summary.total += 1;
                if s.passed {
                    summary.passed += 1;
                } else {
                    summary.failed += 1;
                }
            }
        }
        Self { files, summary }
    }

    pub fn all_passed(&self) -> bool {
        self.summary.failed == 0
            && self
                .files
                .iter()
                .all(|f| f.setup_error.is_none() && f.filter_error.is_none())
    }

    pub fn render_human(&self) -> String {
        let mut out = String::new();
        for file in &self.files {
            out.push_str(&format!("{}\n", file.path.display()));
            if let Some(err) = &file.setup_error {
                out.push_str(&format!("  setup failed: {err}\n"));
            }
            if let Some(err) = &file.filter_error {
                out.push_str(&format!("  filter error: {err}\n"));
            }
            for s in &file.scenarios {
                let mark = if s.passed { "PASS" } else { "FAIL" };
                out.push_str(&format!("  [{mark}] {}\n", s.name));
                if let Some(err) = &s.error {
                    out.push_str(&format!("        error: {err}\n"));
                }
                for a in &s.assertions {
                    if !a.passed {
                        out.push_str(&format!("        assert {} failed: {}\n", a.kind, a.detail));
                    }
                }
                if let Some(v) = &s.agent {
                    let tag = if v.passed {
                        "agent ok"
                    } else {
                        "agent rejected"
                    };
                    out.push_str(&format!("        {tag}: {}\n", v.reasoning));
                }
            }
            if let Some(err) = &file.teardown_error {
                out.push_str(&format!("  teardown failed: {err}\n"));
            }
        }
        out.push_str(&format!(
            "\n{} scenarios: {} passed, {} failed\n",
            self.summary.total, self.summary.passed, self.summary.failed
        ));
        out
    }

    pub fn render_json(&self) -> String {
        serde_json::to_string_pretty(self).unwrap_or_else(|e| format!("{{\"error\":\"{e}\"}}"))
    }
}
