# Talent Grid

An internal creator database for a Dhaka marketing agency. It replaces the
scattered per-category spreadsheets with one searchable set of records, so an
account manager can go from a client brief to a shareable shortlist with
side-by-side comparison in minutes.

## Getting it running

```bash
pnpm install
cp .env.example .env.local     # then fill in the three values
```

`.env.local` needs:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings, API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings, API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings, API. Server-side scripts only; never imported from anything under `app/`. |

Apply the schema to a fresh Supabase project:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Then start the app:

```bash
pnpm dev
```

The first account to sign up is a **viewer**, because roles are raised
deliberately rather than granted on signup. Promote yourself to `admin` once,
directly in the Supabase SQL editor:

```sql
update public.users set role = 'admin' where id = '<your-auth-user-id>';
```

Everything after that is done through `/admin/users`.

## Importing a category spreadsheet

Two routes into the same code. The command line, which writes a full report:

```bash
pnpm import:csv -- --file scripts/data/Influencer_Database_-_Travel.csv --category Travel
# dry run by default; add --commit to write
```

Or `/admin/import` in the app, which previews the parse, shows every value that
failed and every suspected duplicate, and lets a human accept or reject each
merge before anything is written.

The last report generated is at
[`scripts/output/import-report.md`](scripts/output/import-report.md).

## Checking your work

```bash
pnpm test          # follower parsing, every metric formula, the dedup matcher
pnpm typecheck
pnpm verify:db     # runs every migration against a throwaway Postgres, then the
                   # RLS and behaviour tests. Needs Docker.
```

`pnpm verify:db` is the one that matters most: the migrations and the RLS
policies are the part of this codebase the TypeScript compiler cannot check, so
they get their own harness. It asserts, among other things, that a viewer
cannot read `contacts`, that nobody can hard-delete a creator, and that an
anonymous share token returns no internal notes.

## How it is put together

```
app/                    routes; (app) is behind auth, /share/[token] is not
components/ui/          shadcn primitives, added selectively
components/             product components
lib/db/                 every database read, as named async functions
lib/metrics/            every formula, one per file, each with a unit test
lib/import/             the pure half of the CSV importer
scripts/                import, seed and the schema verification harness
supabase/migrations/    the schema, in order. Never edited through the dashboard.
```

A few decisions worth knowing before you change something:

**Null is not zero.** A creator with no recorded average views displays
"No data". Nothing in the product fills a gap with a plausible-looking number,
and the import script reports every field it left empty.

**Follower counts are integers.** `4.7m` is parsed once, at import, into
`4700000`. Anything that does not match a known pattern is reported and left
null rather than guessed at.

**Metric snapshots are append-only.** A new follower count is a new dated row,
never an overwrite. Every growth and trend figure depends on that history, and
the database refuses to let a snapshot's date move.

**Tier and primary platform are derived.** A database trigger recomputes them
from the highest follower count whenever an account or a snapshot changes, so
there is exactly one place that decides what tier a creator is in.

**The orange is a pointer, not a theme.** It is permitted on the active nav
underline, the primary button, the portrait hover badge, the best-value marker
in comparison tables, parse failures in the import preview, and one stat card
on the home page. If more than roughly two percent of a screen is orange,
something has gone wrong.

## Known gaps

- **Portraits.** Every creator currently renders as a stone tile with their
  initials, because no images have been supplied. The admin edit page has an
  upload with a 4:5 crop ready for them.
- **Handles for 14 accounts.** The source spreadsheet holds Facebook share
  links and YouTube video links where profile URLs were expected. A post id is
  not a handle, so those are stored as null and listed in the import report.
  Replacing them with real profile URLs is the highest-value cleanup available.
- **No engagement data at all.** The spreadsheets carry follower counts and
  nothing else, so engagement rate, cost per engagement, growth and the agency
  score are null for every imported creator until someone records views, likes
  and comments. The screens are built for that and say so rather than showing
  zeros.
