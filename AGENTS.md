# Working rules

## Before starting
Read `spec/INDEX.md`. Read `spec/00-core.json`. Read only the spec files INDEX.md lists for the current phase. Do not read spec files for other phases.

## Context discipline
Context overflow ends sessions. Treat every token as a cost.

- Never read a file in full when a line range will do. Use ranged reads.
- Never read: `node_modules/`, `.next/`, `pnpm-lock.yaml`, `*.log`, `.git/`, `public/` binaries, or any file over 500 lines without being asked.
- Never read the raw CSVs in `data/`. Read the first 5 lines to check headers, nothing more. The parsing rules are in `spec/03-import.json`.
- Never print file contents back to the user as confirmation. Say what changed, not what the file now contains.
- Never echo a full file after editing it. Report the diff summary in one sentence.
- When searching, use grep with a specific pattern. Do not read directories to find things.
- Do not restate the spec back to the user. They wrote it.

## Session boundaries
Work on one build phase per session. When the phase's `done_when` condition in `spec/07-phases.json` is met:

1. Commit.
2. Write `docs/handoff/phase-N.md` using the template in `docs/handoff/TEMPLATE.md`.
3. Tell the user the phase is complete and to start a new thread.

Do not begin the next phase in the same session.

## Starting a session mid-project
Read the most recent file in `docs/handoff/`. That is the state of the project. Do not reconstruct state by reading the codebase.

## Commits
Commit after every completed task, not at the end of the session. A session that touches more than five files without a commit is a recovery risk.

## Never
- Never invent creator data, metrics, rates, or contacts to make a screen look complete.
- Never display null as zero.
- Never overwrite a metric snapshot; insert a new dated row.
- Never commit `.env.local` or print any key.
- Never add features not in the spec. Raise them instead.
