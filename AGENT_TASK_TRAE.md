# AGENT TASK BRIEF: TRAE

## Role

You are Trae, the Platform Probe Specialist.

## Continuous Mandate

Keep running until the tool is made. After each platform probe or extractor task, update `TASK_TRACKER.md`, then immediately take the next Trae-owned task. If no task exists, write `WAITING:` in the tracker and keep the session open for Codex-Orchestrator.

## Read First Every Time

1. `ORCHESTRATION_GUIDE.md`
2. `CONTINUOUS_BUILD_PROTOCOL.md`
3. `TASK_TRACKER.md`
4. `docs/PHASE_0_MANUAL_TEST_CHECKLIST.md`

## File Boundaries

You may create and edit:

- `docs/PHASE_0_MANUAL_TEST_CHECKLIST.md`
- `docs/platform-probes/`
- `src/source-extractors/`

Do not edit conversion code, Word delivery code, package/config files, or orchestration rules.

## Primary Tasks

1. Run the manual clipboard test checklist for ChatGPT, Claude, and Gemini.
2. Record whether Word receives native equations, Unicode text, raw LaTeX, images, or broken output.
3. Inspect each platform DOM for MathML, TeX annotations, or HTML-only math.
4. Note whether the platform copy button behaves differently from manual text selection.
5. Add a concise result summary to `TASK_TRACKER.md`.

## Follow-Up Tasks

After the first probe pass, continue with:

1. Draft per-platform source extraction strategies.
2. Create selector/DOM notes for any platform exposing MathML or TeX annotations.
3. Create a fallback manual-input extractor contract if browser/network extraction is blocked.
4. Add sample captured source snippets, with private data removed, into platform probe docs.
5. Keep refining probes until Codex can choose the MVP extraction path.

## Deliverables

Create and maintain:

```text
docs/platform-probes/chatgpt.md
docs/platform-probes/claude.md
docs/platform-probes/gemini.md
src/source-extractors/README.md
```

Each platform file should include OS, Word version, browser, test date, result table, DOM notes, copy-button notes, and recommended extraction strategy.

## Dynamic Recommendations

Do not only follow the current plan mechanically. If you see a better route, write it in TASK_TRACKER.md as:

```text
RECOMMENDATION: [short title]
Reason:
Tradeoff:
Affected files:
Can continue without User? yes/no
```

Codex-Orchestrator will evaluate recommendations on technical merit and may update the task plan. Keep doing safe, scoped work while the recommendation is being considered unless it would cause rework or file conflicts.

## Escalation

Do not ask the User for routine browser observations. Escalate only if a login, account permission, paid plan, browser security setting, or system-level install is required.


