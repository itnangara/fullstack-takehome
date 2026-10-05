# Medverse Take-Home — Starter

A cut-down slice of our production stack. Read `ASSIGNMENT.md` first.

## Layout

```
functions/            Firebase Cloud Functions (TypeScript, Node 22)
  src/core/           auth, shared infrastructure
  src/features/       one folder per feature: handler → service → repository
  tests/              vitest unit tests + Firestore rules tests
web/                  Next.js 15 portal (App Router)
  src/app/            routes
  src/lib/            API client, session helpers
  public/             hand-written HTML/CSS/JS pages (no framework, keep it that way)
firestore.rules       what is deployed today
seed/                 tenant tokens and example training documents
```

## Run

Preferred: open this repo in a GitHub Codespace — the devcontainer installs
Node 22 and Java and runs `npm ci` for you. Locally:

```bash
npm ci --ignore-scripts   # verified: tests and build work without lifecycle scripts
npm run dev          # http://localhost:3000/trainings and http://localhost:3000/launch.html
npm run test         # service unit tests
npm run test:rules   # rules tests, starts the Firestore emulator (needs Java 11+)
```

Node 22 and npm 10+. If Java is missing locally, note it in `NOTES.md` and still
hand in your `firestore.rules` — we can run the tests on our side.

## House rules in this codebase

- Handlers are thin: validate → call service → respond. No business logic.
- Services do not touch the Firebase SDK; Firestore access lives in a repository.
- Everything is `strict: true`. No `any`.
- Test names read `methodOrAction_condition_expectedResult`.

## Implemented assignment

See `NOTES.md` for decisions, verification results, and external integration limits.

Use Node 22.23.3 and npm 10+. `.nvmrc` records the validated Node version.
With nvm-windows, run `nvm install 22.23.3` if needed, then `nvm use 22.23.3`
explicitly; nvm-windows does not automatically apply `.nvmrc`.

```bash
npm ci --ignore-scripts
npm test              # service, handler, auth, portal API, and vanilla launch tests
npm run test:rules    # actual Firestore emulator authorization tests
npm run lint          # JavaScript/TypeScript and Next.js checks; zero warnings
npm run typecheck     # both workspaces
npm run build         # Functions and production portal
```

For the portal, copy `web/.env.example` to `web/.env.local` and set
`MEDVERSE_TRAININGS_URL` to the complete deployed/emulated function URL.
The URL is server-only; the starter's public API-key query parameter was removed
because the given backend never validates it. Firebase ID tokens still authorize
every catalog request.

`npm run dev` starts the portal only. The supplied `mv_session` httpOnly cookie
must contain a valid Firebase ID token from the external SSO/LTI integration.
Without it the portal displays a session message. Backend startup, Firebase
credentials, and importing training seed documents remain external setup; the
starter does not supply a complete local backend/login workflow.

White-label demonstrations do not need authentication:

- `/launch.html?tenant=bayer&training=t-central-line&title=Central%20Line%20Placement&minutes=25`
- `/launch.html?tenant=corpuls&training=t-cpr&title=Advanced%20Life%20Support&minutes=40`

`seed/tenants.json` is the single source of public branding configuration.
`/tenants.json` serves that data as a static JSON response; edit the seed and
rebuild to add or change a tenant. No HTML edits are needed. Unknown tenants use
the demo theme. The query selects branding only, never API authorization.
`/trainings?tenant=bayer` carries that presentation choice into launch links.

The launch button preserves navigation to `/api/launch?training=...` with safe
encoding. That endpoint is absent from the starter and intentionally has not
been invented; see `NOTES.md`.
