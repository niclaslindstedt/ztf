use crate::config::AgentReview;
use crate::shell::CmdOutput;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use zag_agent::builder::AgentBuilder;

const STDOUT_STDERR_TRUNC: usize = 4000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentVerdict {
    pub passed: bool,
    pub reasoning: String,
}

pub struct VerifyContext<'a> {
    pub scenario_name: &'a str,
    pub act_command: &'a str,
    pub act_output: &'a CmdOutput,
}

pub async fn verify(review: &AgentReview, ctx: VerifyContext<'_>) -> AgentVerdict {
    let schema = serde_json::json!({
        "type": "object",
        "required": ["passed", "reasoning"],
        "properties": {
            "passed":    { "type": "boolean" },
            "reasoning": { "type": "string"  }
        },
        "additionalProperties": false
    });

    let prompt = build_prompt(review, &ctx);
    match run_agent(review, prompt, schema).await {
        Ok(text) => parse_verdict(&text),
        Err(e) => AgentVerdict {
            passed: false,
            reasoning: format!("agent invocation failed: {e}"),
        },
    }
}

async fn run_agent(
    review: &AgentReview,
    prompt: String,
    schema: serde_json::Value,
) -> Result<String> {
    let mut builder = AgentBuilder::new()
        .provider(review.provider.as_deref().unwrap_or("claude"))
        .auto_approve(true)
        .quiet(true)
        .json_schema(schema);
    if let Some(model) = &review.model {
        builder = builder.model(model);
    }

    let output = builder.exec(&prompt).await?;
    if output.is_error {
        let msg = output
            .error_message
            .unwrap_or_else(|| "agent reported error".into());
        anyhow::bail!(msg);
    }
    output
        .result
        .ok_or_else(|| anyhow::anyhow!("agent produced no result text"))
}

fn parse_verdict(text: &str) -> AgentVerdict {
    match serde_json::from_str::<AgentVerdict>(text) {
        Ok(v) => v,
        Err(e) => AgentVerdict {
            passed: false,
            reasoning: format!("could not parse agent JSON ({e}); raw={text}"),
        },
    }
}

/// Versioned prompt template. Per §13.5 of `OSS_SPEC.md`, the prompt
/// lives in a file under `prompts/<name>/<major>_<minor>_<patch>.md`
/// rather than as an inline string here. We embed it at compile time
/// so the binary stays self-contained.
const PROMPT_TEMPLATE: &str = include_str!("../prompts/agent-review/1_0_0.md");

fn build_prompt(review: &AgentReview, ctx: &VerifyContext<'_>) -> String {
    let stdout = truncate(&ctx.act_output.stdout, STDOUT_STDERR_TRUNC);
    let stderr = truncate(&ctx.act_output.stderr, STDOUT_STDERR_TRUNC);
    let exit_code = ctx.act_output.exit_code.to_string();
    render_prompt(PROMPT_TEMPLATE)
        .replace("{scenario_name}", ctx.scenario_name)
        .replace("{act_command}", ctx.act_command)
        .replace("{exit_code}", &exit_code)
        .replace("{stdout}", &stdout)
        .replace("{stderr}", &stderr)
        .replace("{reviewer_instructions}", &review.prompt)
}

/// Strip the YAML front matter and the human-only `# heading`, then
/// concatenate the `## System` and `## User` section bodies into the
/// single prompt string we hand to the agent runtime.
fn render_prompt(template: &str) -> String {
    let body = strip_front_matter(template);
    let (system, user) = split_sections(body);
    format!("{system}\n\n{user}")
}

fn strip_front_matter(s: &str) -> &str {
    if let Some(rest) = s.strip_prefix("---\n")
        && let Some(end) = rest.find("\n---\n")
    {
        return &rest[end + "\n---\n".len()..];
    }
    s
}

fn split_sections(body: &str) -> (String, String) {
    let mut system = String::new();
    let mut user = String::new();
    let mut current: Option<&mut String> = None;
    for line in body.lines() {
        match line.trim_end() {
            "## System" => current = Some(&mut system),
            "## User" => current = Some(&mut user),
            l if l.starts_with("# ") => current = None,
            l => {
                if let Some(buf) = current.as_deref_mut() {
                    buf.push_str(l);
                    buf.push('\n');
                }
            }
        }
    }
    (system.trim().to_string(), user.trim().to_string())
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        let mut out = s[..max].to_string();
        out.push_str("\n...[truncated]");
        out
    }
}
