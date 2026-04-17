use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct TestFile {
    #[serde(default)]
    pub setup: Option<Setup>,
    #[serde(default)]
    pub teardown: Option<Teardown>,
    #[serde(default, rename = "scenario")]
    pub scenarios: Vec<Scenario>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct Setup {
    #[serde(default)]
    pub commands: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct Teardown {
    #[serde(default)]
    pub commands: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Scenario {
    pub name: String,
    #[serde(default)]
    pub arrange: Option<Arrange>,
    pub act: Act,
    #[serde(default, rename = "assert")]
    pub asserts: Option<Assert>,
    #[serde(default)]
    pub agent_review: Option<AgentReview>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct Arrange {
    #[serde(default)]
    pub commands: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Act {
    pub command: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct Assert {
    #[serde(default)]
    pub exit_code: Option<i32>,
    #[serde(default)]
    pub stdout_contains: Vec<String>,
    #[serde(default)]
    pub stderr_contains: Vec<String>,
    #[serde(default)]
    pub file_exists: Vec<String>,
    #[serde(default)]
    pub file_contains: Vec<FileContains>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FileContains {
    pub path: String,
    pub contains: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AgentReview {
    pub prompt: String,
    #[serde(default)]
    pub provider: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
}

pub fn load(path: &Path) -> Result<TestFile> {
    let text = std::fs::read_to_string(path)
        .with_context(|| format!("reading test file {}", path.display()))?;
    parse(&text).with_context(|| format!("parsing test file {}", path.display()))
}

pub fn parse(text: &str) -> Result<TestFile> {
    let file: TestFile = toml::from_str(text)?;
    Ok(file)
}
