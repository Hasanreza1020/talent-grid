# Spec routing table

Read only what the current phase needs. Reading more is what ends sessions.

**Always read:** `spec/00-core.json`

| Phase | Also read |
| --- | --- |
| 1 — Foundation | `spec/02-schema.json`, `spec/01-design.json` |
| 2 — Data in | `spec/02-schema.json`, `spec/03-import.json` |
| 3 — Admin | `spec/02-schema.json`, `spec/05-routes.json` |
| 4 — Creator detail | `spec/05-routes.json`, `spec/04-metrics.json`, `spec/01-design.json` |
| 5 — Browse | `spec/05-routes.json`, `spec/01-design.json` |
| 6 — Home | `spec/05-routes.json`, `spec/01-design.json` |
| 7 — Comparison | `spec/06-comparison.json`, `spec/04-metrics.json` |
| 8 — Shortlists | `spec/05-routes.json`, `spec/02-schema.json` |
| 9 — Ingestion | `spec/02-schema.json`, `spec/04-metrics.json` |

`spec/07-phases.json` holds the phase list and each phase's `done_when`. Read it only
when you need to confirm a phase is finished.

## File contents

- `00-core.json` — meta, stack, environment, conventions, hard_rules, out_of_scope_for_v1, open_questions_for_the_owner
- `01-design.json` — design_direction
- `02-schema.json` — data_model
- `03-import.json` — data_import
- `04-metrics.json` — metrics
- `05-routes.json` — routes
- `06-comparison.json` — comparison_feature
- `07-phases.json` — build_phases
