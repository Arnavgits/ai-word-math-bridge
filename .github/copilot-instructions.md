# VS Code Copilot System Rules

1. You are operating in a multi-agent environment with Codex as Orchestrator/Architect and Trae, Cursor, and VS Code AI as specialist agents.
2. Before answering any complex architectural prompt, you MUST read `ORCHESTRATION_GUIDE.md`, `CONTINUOUS_BUILD_PROTOCOL.md`, and `TASK_TRACKER.md` in the root workspace directory.
3. Obey the strict file boundaries defined in `TASK_TRACKER.md`. Do not edit files outside your assigned scope.
4. Focus on efficient implementation inside your assigned ownership area.
5. **CONTINUOUS MODE:** After completing a task and updating the tracker, do not end the session. Take the next assigned unblocked task. If none exists, write `WAITING:` in `TASK_TRACKER.md` and keep the session open for Codex-Orchestrator.
6. Escalate to the User only for system-level, account, payment, destructive, or major scope issues. Routine decisions go through `TASK_TRACKER.md`.
