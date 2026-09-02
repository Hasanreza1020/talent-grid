# Where things live — the routing table

Read narrowly. Open the one area a task touches, not the tree. Reading more is
what fills the context window and ends sessions.

**Always orient from:** `README.md` (§ "How it is put together" and the
decisions that follow it) and this file. Nothing else needs reading up front.

Then open only the area the task is in:

| Working on… | Read |
| --- | --- |
| Data model / schema / RLS | `supabase/migrations/` (in filename order), `lib/types.ts` |
| CSV / TSV import | `lib/import/transform.ts`, `lib/dedup.ts`, `lib/handles.ts`, `scripts/import-csv.ts` |
| Admin screens (create/edit creator) | `components/admin/`, `app/admin/actions.ts` |
| Creator detail page | `app/(app)/creators/[slug]/`, `lib/db/creators.ts` |
| Browse / filter / search | `app/(app)/page.tsx`, `components/browse/`, `lib/browse.ts` |
| Comparison feature | `components/compare/`, `lib/compare.ts` |
| Shortlists / sharing | `app/share/[token]/`, `lib/db/` |
| Metrics ingestion | `lib/metrics/` (one source per file under `sources/`), `scripts/refresh-metrics.ts` |
| Auth / access control | `middleware.ts`, `supabase/migrations/*_rls.sql`, `lib/db/` |

## Ground rules that outrank convenience

These are enforced in code and migrations; changing a screen does not change
them. Full rationale is in `README.md`.

- **Null is not zero.** Missing data renders "No data", never `0`.
- **Metric snapshots are append-only.** A new count is a new dated row.
- **Tier and primary platform are derived** by a DB trigger, not set by hand.
- **Contacts are viewer-invisible.** RLS, not the UI, enforces it.

## What is NOT here

There is no `spec/*.json`. Earlier drafts of this file pointed at
`00-core.json` … `07-phases.json`; those files were never committed, and
chasing them forced whole-codebase scans. The table above replaces them.
`docs/handoff/` holds session handoffs when a large piece of work is paused.
