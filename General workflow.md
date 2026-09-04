# Multi-Agent Orchestration: General Workflow & First Principles

> [!IMPORTANT]
> **REFERENCE ONLY.** These files are the core templates for the General Agentic Workflow. **Do NOT modify these files unless explicitly discussed and approved by the User.** They are used as read-only references to scaffold new projects.

## 1. First Principles Summary

When combining multiple AI agents (Antigravity, Cursor, VS Code AI, Trae) to work simultaneously, the primary bottlenecks are **shared state** (the file system) and **communication** (agents cannot natively talk to each other in real-time). 

To solve this and achieve maximum development velocity, we use an **Orchestrator-Worker model** driven by Markdown-based message passing:
- **Markdown as the Shared Memory Bus:** Agents do not communicate directly. They read from and write to shared configuration files (`TASK_TRACKER.md`, `ORCHESTRATION_GUIDE.md`).
- **Strict Domain Boundaries:** To prevent merge conflicts and logical corruption, agents must never edit the same file simultaneously. 
- **Interface-First Development:** The Architect (Antigravity) and the User define the API contracts (e.g., TypeScript interfaces) first. Once the contract is set, the Tactical agents (Cursor/VS Code) can build the implementation in parallel.

### Agent Roles
1. **The Orchestrator (User)**: Defines the ultimate goal, assigns strict boundaries, and acts as the router to pass context between agents.
2. **The Architect (Antigravity)**: Operates autonomously in the background. Handles broad strokes: scaffolding, terminal execution, dependency management (`npm install`), CI/CD, and system-wide refactoring.
3. **The Tactical Agents (Cursor, Trae, VS Code AI)**: UI-bound tools excellent at zero-latency, cursor-aware inline generation. Handles real-time autocomplete, component building, and specific algorithm implementation.

---

## 2. Optimized Framework Files (Master Templates)

These are the highly optimized templates that power the system. To initialize a new project, these files must be placed in the project's root directory.

### A. `ORCHESTRATION_GUIDE.md`
*Purpose: The constitution for all AIs.*
```markdown
# Global AI Orchestration Rules

**To all AI Agents (Cursor, Trae, VS Code AI, Copilot) reading this:**
You are operating in a multi-agent environment overseen by an Architect Agent (Antigravity).

## 1. Golden Rules
- **NEVER** modify this `ORCHESTRATION_GUIDE.md` file. Only the Architect and the User can modify this file.
- **NEVER** make broad structural or architectural changes without consulting the `TASK_TRACKER.md`.
- **ALWAYS** check `TASK_TRACKER.md` to understand your current specific scope. Do not work outside your defined boundaries.

## 2. Agent Roles
- **Antigravity (Architect)**: System scaffolding, background command execution, core architecture.
- **Cursor / Trae / VS Code AI (Tactical)**: Inline code generation, specific file implementation, real-time UI building.
- **User (Orchestrator)**: Approves code, defines product goals, passes context.

## 3. Communication Protocol
- Completed tasks are marked as `[x]` in `TASK_TRACKER.md` by the User or Architect.
- For architectural clarification, Tactical agents must ask the User to consult the Architect.
```

### B. `TASK_TRACKER.md`
*Purpose: The dynamic state machine and Kanban board. Frequently updated.*
```markdown
# Active Task Queue

*Last Updated: [Timestamp]*

## Current Project Goal
[Define the ultimate goal of the software being built]

## Active File Boundaries
- **Antigravity Ownership**: [e.g., /backend/routes]
- **Cursor / Trae / VS Code AI Ownership**: [e.g., /frontend/components]

## Task Backlog
- [ ] Macro Task 1 (Assigned to Antigravity)
- [ ] Micro Task 1 (Assigned to Cursor)

## Completed
- [x] Initial Scaffolding
```

### C. `.cursorrules` / `.github/copilot-instructions.md`
*Purpose: Forces IDE-bound agents to automatically ingest the global rules.*
```markdown
# IDE Agent System Rules

1. You are operating in a multi-agent environment (Antigravity, Cursor, VS Code AI, Trae).
2. Before answering any complex architectural prompt, you MUST read `ORCHESTRATION_GUIDE.md` and `TASK_TRACKER.md` in the root workspace directory.
3. Obey the strict file boundaries defined in `TASK_TRACKER.md`. Do not edit files outside your assigned scope.
4. Focus purely on efficient, inline implementation. Leave broad background tasks (like `npm install` or massive refactors) to the Architect.
```
