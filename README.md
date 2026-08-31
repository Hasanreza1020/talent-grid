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
pnpm import:csv -- --file scripts/data/Influencer_Database_-_Travel.tsv --category Travel
# dry run by default; add --commit to write
```

Comma- and tab-separated files both work. The delimiter is detected from the
header line rather than from the file extension, because a file named `.csv`
that is actually tab-separated is a normal thing to receive and parsing it as
one giant column is the worst available failure. Fully blank rows are treated
as the visual separators they are and skipped; a row carrying data but no name
is reported.

Or `/admin/import` in the app, which previews the parse, shows every value that
failed and every suspected duplicate, and lets a human accept or reject each
merge before anything is written.

The last report is at
[`scripts/output/import-report.md`](scripts/output/import-report.md).

## Importing portraits

```bash
pnpm import:portraits -- --dir "C:\Users\Hasan\Downloads\Influencer Database\Travel"
# dry run by default; add --commit to upload
```

One folder of images per category, named after the creator. Filenames do not
match the sheet exactly (`bd traveller.jpg` against `Bd travellers`,
`Mr. Mixer_s World.jpg` against `Mr. Mixer's World`), so matching reuses the
same normalisation and similarity as the duplicate matcher, with a confidence
threshold. Anything below it is reported rather than attached: putting the
wrong face on a creator is worse than leaving the tile blank.

Images are centre-cropped to 4:5, resized to 1000x1250 and stored as WebP **in
colour**. The black-and-white treatment is a render-time CSS filter and is
never baked into the stored file. The report is at
[`scripts/output/portrait-report.md`](scripts/output/portrait-report.md).

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

- **One creator has no portrait.** Kawser Ahmed Abid, because the Travel image
  folder has no file for him. He renders as a stone tile with his initials,
  which is the designed fallback, not a broken state.
- **`The Foodieveller.jpg` is unused.** It sits in the Travel image folder but
  matches no creator on the Travel sheet (38% to the nearest name), so it was
  left alone rather than attached to someone.
- **Handles for 14 accounts.** The source spreadsheet holds Facebook share
  links and YouTube video links where profile URLs were expected. A post id is
  not a handle, so those are stored as null and listed in the import report.
  Replacing them with real profile URLs is the highest-value cleanup available.
- **Only Travel is loaded.** The image folders also hold Beauty, Food,
  Lifestyle and Sports. Each needs its own sheet before its portraits can be
  matched to anything.
- **No engagement data at all.** The spreadsheets carry follower counts and
  nothing else, so engagement rate, cost per engagement, growth and the agency
  score are null for every imported creator until someone records views, likes
  and comments. The screens are built for that and say so rather than showing
  zeros.
