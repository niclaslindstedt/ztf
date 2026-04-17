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

fn build_prompt(review: &AgentReview, ctx: &VerifyContext<'_>) -> String {
    let stdout = truncate(&ctx.act_output.stdout, STDOUT_STDERR_TRUNC);
    let stderr = truncate(&ctx.act_output.stderr, STDOUT_STDERR_TRUNC);
    format!(
        "You are reviewing the result of an end-to-end test scenario.\n\
         Respond ONLY with JSON matching the schema: {{\"passed\": bool, \"reasoning\": string}}.\n\
         \n\
         Scenario: {name}\n\
         Command:  {cmd}\n\
         ExitCode: {code}\n\
         \n\
         --- stdout ---\n{stdout}\n\
         --- stderr ---\n{stderr}\n\
         --- reviewer instructions ---\n{instr}\n",
        name = ctx.scenario_name,
        cmd = ctx.act_command,
        code = ctx.act_output.exit_code,
        instr = review.prompt,
    )
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
