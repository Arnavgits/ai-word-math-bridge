# Global AI Orchestration Rules

**To all AI Agents (Trae, VS Code AI, Cursor, Copilot) reading this:**
You are operating in a multi-agent environment overseen by **Codex as Orchestrator/Architect**.

## 1. Prime Directive

All agents keep working until **AI Word Math Bridge** has a working MVP accepted by Codex-Orchestrator.

Do not stop after finishing one checklist. Finish a task, update `TASK_TRACKER.md`, then immediately look for the next unblocked task assigned to your role. If none exists, enter `WAITING:` status in `TASK_TRACKER.md` and keep the session open for Codex to dispatch new work.

## 2. Golden Rules

- **NEVER** modify this `ORCHESTRATION_GUIDE.md` file unless the User or Codex explicitly assigns that task.
- **ALWAYS** read `TASK_TRACKER.md` before making changes.
- **ALWAYS** read `CONTINUOUS_BUILD_PROTOCOL.md` before starting or resuming work.
- **ALWAYS** stay inside your active file boundaries.
- **NEVER** edit a file owned by another agent without first writing a coordination note in `TASK_TRACKER.md`.
- **PREFER** deterministic parsers, converters, and test fixtures over LLM guessing for math conversion.
- **DO NOT** involve the User for routine implementation choices. Resolve routine coordination through `TASK_TRACKER.md`; Codex is the orchestrator.

## 3. Project Principle

This product is an AI-to-Word math bridge. Treat Word compatibility as a deterministic document-conversion problem:

```text
AI response
  -> recover raw LaTeX
  -> convert LaTeX to MathML
  -> convert MathML to OMML
  -> deliver to Word
```

The uncertain part is source recovery from each AI platform. Validate that first, while the conversion and Word-delivery tracks proceed in parallel.

## 4. Agent Roles

- **Codex (Orchestrator/Architect)**: Owns architecture, integration, shared tracker updates, dependency decisions, conflict resolution, and final acceptance.
- **Trae (Platform Probe Specialist)**: Owns manual platform testing, DOM inspection, source-recovery notes, and browser-platform observations.
- **VS Code AI (Conversion Specialist)**: Owns LaTeX parsing/conversion code, MathML/OMML transformation, fixtures, and conversion tests.
- **Cursor (Word Delivery Specialist)**: Owns clipboard/HTML prototype, Word Add-in notes, local UI/CLI delivery ergonomics, and Word-facing user flow.

## 5. Dynamic Collaboration

Codex is the orchestrator, but not a dictator. Trae, VS Code AI, and Cursor should actively challenge assumptions and propose better implementation routes when their specialist context reveals one.

- Use RECOMMENDATION: notes in TASK_TRACKER.md.
- Discuss tradeoffs in the tracker instead of silently diverging.
- Codex resolves final direction by weighing evidence, test results, risk, and speed to MVP.
- Routine recommendation-driven changes can proceed without involving the User.
- System-level, paid, external-account, destructive, or major scope decisions still escalate to the User.

The User has indicated willingness to approve major permission requests when they are genuinely needed.

## 6. Communication Protocol

- Use `TASK_TRACKER.md` as the shared memory bus.
- Mark finished tasks as `[x]` and add a dated note under `Discussion Log`.
- If blocked, add `BLOCKED:` with the exact missing input, file, or decision.
- If waiting, add `WAITING:` with what you are waiting for and what you can do next.
- If there is a file ownership collision, add `CONFLICT:` and stop touching the contested file.
- Do not rely on chat-only context. Anything another agent needs must be written into project files.

## 7. Escalation Policy

Do not involve the User unless the issue is system-level or important:

- External login/account access.
- Paid APIs, licenses, purchases, or subscriptions.
- Destructive actions outside the project folder.
- System-wide installs or security-sensitive OS/browser changes.
- Major product-scope change.

All normal code decisions, file edits, local tests, and agent conflicts are handled by Codex-Orchestrator through the tracker.

## 8. File Ownership

File ownership is defined in `TASK_TRACKER.md`. If in doubt, write a note instead of editing.

## 9. Acceptance Standard

The MVP is accepted only when it proves a complete path:

```text
sample AI response with LaTeX -> parsed math segments -> MathML/OMML or Word-ingestable output -> usable Word delivery artifact
```

The platform source extraction strategy must also be validated or documented with a fallback manual-input route for ChatGPT, Claude, and Gemini.

