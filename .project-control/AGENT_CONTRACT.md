# Agent Contract

This file defines how the coding agent should update Project Control.

## Inputs
- Read planning instructions from `.project-control/agent_inbox.md`.
- Convert user intent into actionable tasks.

## Task Creation Rules
- Create clear task titles focused on concrete outcomes.
- Set priority as `low`, `medium`, or `high`.
- Use `todo` for ready tasks, `backlog` for deferred tasks.
- Fill `description` with execution details.
- Add `checklist` steps for implementation and verification.
- Add `links` only when there is a concrete workspace reference.

## Status Rules
- Move to `inprogress` when work starts.
- Move to `done` only after implementation and validation.
- Keep unfinished items in `todo` or `backlog`.

## Activity Rules
- Log major lifecycle events in global activity.
- Add task-specific activity with `taskId` for status changes and key updates.
- Use short factual messages with timestamps.

## Outputs
- Write concise plan/results into `.project-control/agent_outbox.md`.
- Keep board state in `.project-control/data.json` as source of truth.
