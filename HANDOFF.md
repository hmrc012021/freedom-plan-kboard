# K-Board — session handoff

This app was originally built in a session rooted in `freedom-plan-fitness` (a directory mixup), even though all the code correctly landed here in `freedom-plan-kboard` with its own git repo. This file captures that history so a fresh session in this folder has full context.

## What it is
K-Board is an MLB pitcher-strikeout projections tool: matchup cards, a K-tally, a what-if simulate slider, and shrinkage-based predictability math. Vite + React + TypeScript, same architectural pattern as the Spain and Fitness apps (`freedom-plan-spain`, `freedom-plan-fitness`).

## Architecture
- **Supabase**: shares one project with the other Freedom Plan apps — "Freedom Plan" (`ojwxetjlxqhjtltuycml`) — but is fully isolated in its own Postgres schema, `mlb`. The client pins to it explicitly (`src/lib/supabaseClient.ts`: `createClient<Database, 'mlb'>(url, anonKey, { db: { schema: 'mlb' } })`).
- **Access control**: originally the `mlb` tables were readable by anyone with the anon key. That's now locked down — every table's RLS policy requires the caller to be present in `mlb.kboard_access`. You (`hmrc.01.2021@gmail.com`) are seeded in as owner. Adding anyone else currently requires calling the DB function `mlb.add_kboard_member_by_email` directly — **no UI exists for this yet**.
- **Git/GitHub**: `main` branch, pushed via SSH to `github.com:hmrc012021/freedom-plan-kboard`.
- **Netlify**: deployed live at **https://freedom-plan-kboard.netlify.app**, under the `hmrc-01-2021` Netlify team, site name `freedom-plan-kboard`.

## What's built (4 tabs, all ported)
- **Today's Board** (`src/pages/Today.tsx`)
- **Team Roster** (`src/pages/Roster.tsx`)
- **Simulate / Day Slate** (`src/pages/Simulate.tsx`, `src/components/matchup/MatchupSlate.tsx`, `StarterRow.tsx`)
- **Predictability** (`src/pages/Predictability.tsx`, `src/lib/predictability.ts`)
- Login (`src/pages/Login.tsx`) — real Supabase email/password auth, same pattern as Spain/Fitness.
- Shared UI: `src/components/ui/KTally.tsx`, `SummaryCard.tsx`, `PitcherModal.tsx`, `AppShell.tsx`, `Sidebar.tsx`.
- Data layer: `src/lib/kboardData.ts`, `useEasternSlate.ts`, `format.ts`, `utils.ts`.

## Bug already fixed
An infinite-recursion RLS bug (Postgres `42P17`) on the `kboard_access` table itself — its policy queried `kboard_access` directly instead of going through the `is_kboard_member()` helper the other 9 tables use. Fixed at the DB level; also fixed `App.tsx`, which was silently treating any DB error as "not authorized" and masking the real bug — it now shows a distinct error state.

## Your own assessment (last check-in)
You called K-Board **~95% done**. The gap you and the assistant agreed on:
1. **Access-management UI** — right now adding a member is a raw SQL/function call, no screen for it. Decide if you need this before adding anyone besides yourself.
2. **You personally haven't clicked through all 4 authenticated tabs yet** — the assistant won't type your password into the login form, so it's only confirmed the build is clean and type-checked, never actually seen the logged-in UI render. Worth doing before trusting it with real decisions.

## Known cleanup item
`src/types/database.types 2.ts` — an untracked macOS "keep both" duplicate file, harmless but unused. Safe to delete whenever.

## Not part of K-Board (don't let these bleed in)
The same session also worked on Spain (budget/editability fixes) and Fitness (training-zone overhaul, Garmin-aligned zone math, `steps` column for structured workouts) — none of that touches K-Board's code or schema. If you paste this into a new session, it starts clean with only K-Board context.
