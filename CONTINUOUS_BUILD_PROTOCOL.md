# Continuous Build Protocol

All agents must keep working until **AI Word Math Bridge** has a working MVP accepted by Codex-Orchestrator.

## Non-Stop Agent Loop

Every agent runs this loop:

1. Read `ORCHESTRATION_GUIDE.md`.
2. Read `TASK_TRACKER.md`.
3. Read your `AGENT_TASK_*.md` file.
4. Pick the highest-priority unblocked task assigned to your role.
5. Work only inside your file boundaries.
6. Run the smallest relevant verification you can.
7. Update `TASK_TRACKER.md` with status, files changed, evidence, blockers, and next action.
8. Immediately look for the next task.
9. If no task is assigned to you, write `WAITING:` in the Discussion Log and keep the session open for Codex to dispatch more work.

## Escalation Rules

Do not involve the User for routine code choices, local file edits, small dependency choices, test failures, or task sequencing. Handle those through `TASK_TRACKER.md`.

Escalate to the User only for:

- External account login or permission issues.
- Paid services, purchases, or license decisions.
- Destructive actions outside the project folder.
- System-wide installation or security-sensitive browser/OS changes.
- Product scope changes that materially alter the goal.

## Dynamic Recommendation Protocol

Agents are expected to recommend better approaches, not merely execute Codex's first plan.

- Put proposals in TASK_TRACKER.md under Discussion Log with RECOMMENDATION:.
- Include the tradeoff, affected files, and whether the proposal blocks current work.
- Codex-Orchestrator must consider agent recommendations on technical merit and synthesize the best route.
- If a recommendation is clearly better and inside the current product goal, Codex may update tasks without asking the User.
- If a recommendation changes product scope, requires paid services, needs external account access, or changes system-level permissions, escalate to the User.

The User has indicated willingness to approve important/major permissions when needed. Agents should ask only when the escalation rules apply.

## Conflict Resolution

- If two agents need the same file, stop editing that file and write `CONFLICT:` in `TASK_TRACKER.md`.
- Codex-Orchestrator decides ownership or creates a shared interface file.
- Do not overwrite another agent's work.

## Definition of Done

The tool is not done until it can:

- Accept AI response text containing LaTeX math.
- Parse inline and display math segments.
- Convert math into Word-native or Word-ingestable equation output.
- Produce a usable delivery artifact or flow for Microsoft Word.
- Include repeatable verification fixtures.
- Document platform extraction findings or provide a fallback manual-input route.

Until that standard is met, continue working.

