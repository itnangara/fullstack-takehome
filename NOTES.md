# Take-home implementation notes

## What I did and why

### Task 1 — Trainings API

I derive tenant authorization from verified Firebase claims, never query parameters. The service queries only that tenant's published trainings, sorts by order then title, and maps documents to explicit public summaries. Authenticated responses are private and uncached. I preserved the starter's wildcard CORS header on successful responses.

### Task 2 — Firestore rules

Users can read and write only their own sessions within their claimed tenant. Client creates exclude the backend-owned score; updates cannot add, change or remove it, or transfer user/tenant identity. Only progress and updatedAt are mutable. Own-session deletion remains allowed, including sessions containing a score.

Direct Firestore training reads also require the caller's tenant and published status. The Admin SDK bypasses client rules, so API authorization remains a separate boundary.

### Task 3 — Portal

I moved the catalog to a Server Component, keeping session-token handling server-side and avoiding the client effect-fetch waterfall. Authenticated API requests use no-store. Loading, error/retry, missing-session and empty states are present. Descriptions render as text instead of raw HTML.

Thumbnails use sized Next Image components and intentionally remain local-only because no approved remote-host contract was supplied. This is a scope boundary, not an unfinished requirement. MEDVERSE_TRAININGS_URL must be explicitly configured; missing or blank configuration fails before fetching.

### Task 4 — White-label launch

The page remains vanilla HTML/CSS/JS. Branding comes from the supplied tenant seed, exposed through static /tenants.json. The required branding structure and all expected token strings are checked before applying known tokens; CSS values and logo paths are not restricted.

Tenant selection and display metadata are presentation-only. Query text is rendered as text, and training IDs are encoded for navigation. Branding failure retains usable demo defaults without blocking Start for a selected training. Navigation preserves the starter /api/launch destination.

## What is not finished / next steps

Authentication/session issuance and refresh are external. Firebase credentials, provisioning and deployed endpoint configuration are external setup. No launch backend or contract was supplied: Start currently reaches an absent /api/launch route locally and returns 404.

Real authentication, deployment, external launch integration and hospital-network performance were not validated. Next, I would verify the supplied integrations with provisioned users from two tenants. Broader browser/preflight compatibility was not validated despite preserving successful-response wildcard CORS. Repository decoding still trusts stored Firestore training documents; the portal's response checks do not validate stored data before service processing.

## Starter issues

The tenant query override could spoof authorization scope. Firestore session/training rules were too permissive, including allowing client score tampering. Raw HTML rendering created injection paths, including the seeded payload. The portal mixed server cookie access with a Client Component; the Functions runtime import lacked its required extension. API/environment examples included an unused public key and a misleading endpoint. The development command starts only the portal, not a complete authenticated backend workflow.

## Confirmed validation

Latest checks used Node 22.23.3, npm 10.9.9 and Java 21. npm test passed 25 unit tests; npm run test:rules passed 22 emulator rules tests. Typecheck, lint (zero warnings), both workspace builds and git diff --check passed. These checks establish local validation, not live production integration.
