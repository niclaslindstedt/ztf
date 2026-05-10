# `prompts/`

Versioned LLM prompts. See [`OSS_SPEC.md` §13.5](../OSS_SPEC.md#135-llm-prompts-prompts).

If this project sends prompts to a language model — directly via an SDK
or indirectly via a wrapper — every prompt must live here as a versioned
file rather than as an inline string in source code.

## Layout

```
prompts/
└── <prompt-name>/
    ├── 1_0_0.md
    ├── 1_1_0.md   # in-place edit, bumps minor
    └── 2_0_0.md   # breaking rewrite, bumps major
```

## File format

Each `<major>_<minor>_<patch>.md` file starts with YAML front matter
declaring `name`, `description`, and a `version` whose value matches
the filename stem (`1_2_0.md` → `version: 1.2.0`). After the front
matter come a human-readable `# <prompt-name> — v<version>` heading
and the two required sections `## System` and `## User`:

```markdown
---
name: <prompt-name>
description: One-sentence purpose of this prompt.
version: 1.0.0
---

# <prompt-name> — v1.0.0

## System

…system instructions for the model…

## User

…user message body. May contain `{placeholder}` markers that the
loader substitutes with runtime values…
```

Anything outside the front matter and the `## System` / `## User`
sections is ignored by the loader and is purely for humans reading
the file.

## Versioning rule

- **Patch bump** (`1_0_0` → `1_0_1`): typo / wording fix that does not
  change the model's expected behavior.
- **Minor bump** (`1_0_0` → `1_1_0`): meaningful behavior change that
  is still backward-compatible with the loader's placeholder set.
- **Major bump** (`1_x_y` → `2_0_0`): breaking rewrite — the
  placeholder set, schema, or expected output format has changed and
  callers must be updated.
- Existing versioned files are **never edited**. Every change ships
  as a new file at a bumped semver.
- Loaders pick the highest version unless explicitly pinned.

## Prompts in this project

| Prompt | Used by |
|---|---|
| [`agent-review`](agent-review/1_0_0.md) | `src/agent.rs` — final verdict for `[scenario.agent_review]`. |
