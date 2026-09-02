# Working rules

## Before starting
Read `README.md` (§ "How it is put together") and `spec/INDEX.md`. `INDEX.md` is a routing table: it names the one area each kind of task touches. Open that area and nothing else. There are no `spec/*.json` files — do not look for them.

## Context discipline
Context overflow ends sessions. Treat every token as a cost.

- Never read a file in full when a line range will do. Use ranged reads.
- Never read: `node_modules/`, `.next/`, `pnpm-lock.yaml`, `*.log`, `.git/`, `public/` binaries, or any file over 500 lines without being asked.
- Never read the raw CSVs in `scripts/data/`. Read the first 5 lines to check headers, nothing more. The parsing rules are in `lib/import/transform.ts`.
- Never print file contents back to the user as confirmation. Say what changed, not what the file now contains.
- Never echo a full file after editing it. Report the diff summary in one sentence.
- When searching, use grep with a specific pattern. Do not read directories to find things.
- Do not restate the spec back to the user. They wrote it.

## Session boundaries
Work on one cohesive piece of work per session — a single feature, area, or fix. When it is done:

1. Commit.
2. If the work is large enough that a follow-up session needs the context, write `docs/handoff/<short-name>.md` using the template in `docs/handoff/TEMPLATE.md`.
3. Tell the user the work is complete and to start a new thread for the next piece.

Do not start an unrelated second piece of work in the same session.

## Starting a session mid-project
If `docs/handoff/` holds a handoff for work in progress, read the most recent one first. That is the state of that work. Do not reconstruct state by reading the whole codebase — use the routing table in `spec/INDEX.md` to open only the area you need.

## Commits
Commit after every completed task, not at the end of the session. A session that touches more than five files without a commit is a recovery risk.

## Never
- Never invent creator data, metrics, rates, or contacts to make a screen look complete.
- Never display null as zero.
- Never overwrite a metric snapshot; insert a new dated row.
- Never commit `.env.local` or print any key.
- Never add features outside the project's defined scope (see `README.md`). Raise them instead.
