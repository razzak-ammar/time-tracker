# TimeTracker agent API

Use this API to list projects, create/edit projects, and list/create/edit/delete
events. An **event is a time entry**, not a separate calendar object. Writes appear
in the existing web/iOS clients and trigger the existing reporting worker.

Machine-readable contract: [agent-api.openapi.json](./agent-api.openapi.json).
Implementation: `functions/src/agent-api.ts`; deployment export:
`functions/src/index.ts` → `agentApi`. There are two resource families:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/projects` | List your projects |
| POST | `/projects` | Create a project |
| GET | `/projects/{id}` | Read one project, including trash metadata |
| PATCH | `/projects/{id}` | Rename, recolor, pin/unpin a project |
| GET | `/events` | List/filter your time entries |
| POST | `/events` | Create a completed entry or running timer |
| GET | `/events/{id}` | Read one entry, including trash metadata |
| PATCH | `/events/{id}` | Edit description, times, timer state, or project |
| DELETE | `/events/{id}` | Move an entry to Recently Deleted (30 days) |

Project deletion/restore and permanent deletion remain in the app's existing
callable workflows. They are not exposed by this HTTP API. An agent cannot
restore a trashed item here; restore it in the app first.

## Deploy and configure

From the repository root:

```sh
npm --prefix functions ci
npm --prefix functions test
firebase deploy --only functions:agentApi
```

This deploys to the selected Firebase project (the checked-in default is
`time-tracker-3b6df`). A deployed endpoint has this base URL:

```text
https://us-central1-time-tracker-3b6df.cloudfunctions.net/agentApi
```

Append `/projects` or `/events` to that URL. Use the URL printed by Firebase if
it differs. Deploy the existing `aggregateTimeEntry` function too if this is a
new backend; it updates reporting totals asynchronously. Configure Firestore
TTL for `purgeAt` as described in the recovery runbook before relying on
automatic trash expiry. The agent API needs no additional indexes or secrets.
Deployment is a separate step; adding this code does not make the endpoint live.

The function accepts public HTTP invocation at the infrastructure layer and
verifies Firebase credentials inside the handler. Every operation requires an
**existing user's Firebase ID token** from this Firebase project. No caller can
supply `userId` or bypass per-user ownership checks. CORS is disabled because
this API is intended for agent/server HTTP clients.

## Authentication for an agent

Supply these environment values to your agent's HTTP client:

```text
TIME_TRACKER_API_URL=https://us-central1-time-tracker-3b6df.cloudfunctions.net/agentApi
FIREBASE_API_KEY=<the app's public NEXT_PUBLIC_FIREBASE_API_KEY>
FIREBASE_REFRESH_TOKEN=<refresh token for the account whose data you want to manage>
```

The public Firebase API key identifies the project; it does **not** authorize
access to user data. The refresh token and ID token are credentials: store them
in your agent's secret store, never in this spec or source control. A separate
Firebase account has separate data; to manage your existing entries the agent
must authenticate as your existing account. No service-account key is required.

Obtain tokens with a trusted Firebase Auth SDK sign-in, or through the
[Firebase Auth REST sign-in API](https://firebase.google.com/docs/reference/rest/auth#section-sign-in-email-password):

```http
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=<FIREBASE_API_KEY>
Content-Type: application/json

{"email":"<account email>","password":"<account password>","returnSecureToken":true}
```

A successful sign-in returns `idToken`, `refreshToken`, and `expiresIn`.
ID tokens typically expire after one hour. Your agent's credential provider
should exchange its refresh token for a fresh ID token before expiry (or once
after a 401), using the
[Firebase refresh endpoint](https://firebase.google.com/docs/reference/rest/auth#section-refresh-token):

```http
POST https://securetoken.googleapis.com/v1/token?key=<FIREBASE_API_KEY>
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=<URL-encoded refresh token>
```

Use the returned `id_token` in `Authorization: Bearer <id_token>` and save the
returned `refresh_token` for the next refresh. Re-authenticate if refresh fails;
do not loop on invalid credentials. Tokens for disabled users or revoked
sessions are rejected; the backend uses Firebase Admin's revocation check.
See [Firebase session management](https://firebase.google.com/docs/auth/admin/manage-sessions).

## Request/response rules

- Send `Authorization: Bearer <Firebase ID token>` on every request.
- POST/PATCH bodies are plain JSON objects with `Content-Type: application/json`;
  there is no Firebase callable `{ "data": ... }` request wrapper.
- POST/PATCH bodies are limited to 32 KiB by the handler. Description limit is
  10,000 characters. Unknown body fields are rejected, including owner, audit,
  and deletion metadata. Empty PATCH objects are rejected.
- IDs are 1–128 ASCII letters, digits, underscores, or hyphens.
- Dates are ISO 8601 strings with seconds and `Z` or an explicit offset, e.g.
  `2026-11-01T09:00:00-05:00`. Fractional seconds may have 1–3 digits. Responses
  normalize timestamps to UTC. Supply the offset appropriate for each instant,
  particularly across daylight-saving changes.
- Successful reads/writes return `{ "data": ... }`. Create returns 201, read/edit
  returns 200, delete returns 204 with no body. Responses omit `userId`.
- PATCH only changes supplied fields. Audit timestamps are server-owned.
- DELETE is a retry-safe soft delete with `deletedAt`/`purgeAt`; it does not
  physically erase the entry. Normal lists hide trash. GET by ID can read trash.

### Project fields

Create requires `name` (1–100 characters, not blank) and `color` (`#RRGGBB`).
`isPinned` is optional and defaults to false. PATCH accepts any nonempty subset
of those fields. POST additionally accepts an optional client-selected `id`.

### Event fields

Create requires `projectId`, `startTime`, and, for a completed event, `endTime`.
`description` is optional; `isActive` defaults to false. POST additionally accepts
an optional client-selected `id`.

PATCH accepts any nonempty subset of `projectId`, `startTime`, `endTime`,
`description`, `isActive`. The resulting merged event must satisfy:

- Completed (`isActive: false`): endTime is strictly after startTime.
- Running (`isActive: true`): endTime is absent or null.
- The project exists, belongs to the signed-in user, and is not in trash.

Use `description: ""` to clear a note. To stop a timer, set **both** `isActive:
false` and `endTime` in one PATCH. To restart a completed entry, set `isActive:
true` and `endTime: null`. The API permits overlapping events and multiple
active timers, matching the underlying data model; an agent should check for
active timers before starting another if it wants the UI's single-timer behavior.

### Lists, pagination, and filters

Both list routes accept `limit` (default 100, maximum 200), `cursor` (a previous
`nextCursor`), and `includeDeleted=true|false` (default false).

`GET /events` also accepts `projectId`, `isActive=true|false`, `from`, and `to`.
`from` is inclusive and `to` exclusive, and **both filter by startTime**, not
interval overlap or endTime. They use the same timestamp format as writes.

Lists are ordered by document ID ascending, **not chronological order**.
Filtering happens after reading each bounded page of the user's documents.
This avoids extra Firestore composite indexes and bounds each call to `limit`
documents, but selective filters may require many calls. A page can contain an
empty `data` array and a non-null `nextCursor`. **Continue until nextCursor is
null**, keeping filters unchanged. There can also be a final empty page when
the previous page was exactly full. Concurrent changes do not provide snapshot
isolation across pages; client-selected IDs added before the cursor may require
a fresh traversal to discover.

```json
{"data":[],"nextCursor":"last-scanned-document-id"}
```

### Errors and retries

Handler errors have this shape:

```json
{"error":{"code":"invalid_argument","message":"Completed events require endTime later than startTime."}}
```

| HTTP | Code | Action |
| --- | --- | --- |
| 400 | `invalid_argument` | Correct the body/query |
| 401 | `unauthenticated` | Refresh ID token once or re-authenticate |
| 404 | `not_found` | Wrong route, missing resource, or resource belongs to someone else |
| 405 | `method_not_allowed` | Use an allowed method (also in the Allow header) |
| 409 | `already_exists` | Creation ID collision; GET original ID to check an ambiguous earlier request |
| 409 | `resource_deleted` | Restore the resource/project in the app first |
| 413 | `payload_too_large` | Reduce the JSON body below 32 KiB |
| 415 | `unsupported_media_type` | Send application/json |
| 500 | `internal` | Retry with backoff and the same resource ID |

Firebase infrastructure can return its own errors, including malformed JSON
rejections, throttling, or service unavailability, before the handler runs.

For reliable creation, generate a UUID **once per intended event/project** and
send it as POST `id`. Reuse that ID on retries. After a timeout/409, GET that ID
and compare the returned fields with the intended operation. A 409 is not itself
proof that the intended write succeeded. If you omit `id`, each successful POST
creates a new random ID, so blindly retrying may create duplicates. PATCH and
DELETE target stable IDs; PATCH is last-writer-wins and has no version/ETag check.

## Examples

Assume `TIME_TRACKER_API_URL` and `FIREBASE_ID_TOKEN` are set by your credential
provider. Replace IDs with IDs returned by the API.

```sh
# Find projects (follow nextCursor if present).
curl --fail-with-body "$TIME_TRACKER_API_URL/projects" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN"

# Create an event with a stable, agent-generated ID.
curl --fail-with-body -X POST "$TIME_TRACKER_API_URL/events" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"id":"agent-20261101-review-1","projectId":"PROJECT_ID","startTime":"2026-11-01T09:00:00-05:00","endTime":"2026-11-01T10:00:00-05:00","description":"Reviewed API integration"}'

# Edit only the description.
curl --fail-with-body -X PATCH "$TIME_TRACKER_API_URL/events/agent-20261101-review-1" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"description":"Reviewed and documented API integration"}'

# List events whose start falls in this local day (URL-encode filter values).
curl --fail-with-body --get "$TIME_TRACKER_API_URL/events" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  --data-urlencode 'from=2026-11-01T00:00:00-04:00' \
  --data-urlencode 'to=2026-11-02T00:00:00-05:00' \
  --data-urlencode 'projectId=PROJECT_ID'

# Recoverable delete.
curl --fail-with-body -X DELETE "$TIME_TRACKER_API_URL/events/agent-20261101-review-1" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN"
```

Start timer body:

```json
{"id":"agent-timer-1","projectId":"PROJECT_ID","startTime":"2026-11-01T14:00:00Z","isActive":true,"endTime":null,"description":"Implementation"}
```

Stop timer PATCH body:

```json
{"isActive":false,"endTime":"2026-11-01T15:00:00Z"}
```

## Suggested agent instructions

> Use the TimeTracker HTTP API and its OpenAPI contract. Authenticate with the
> credential provider's Firebase ID token. Discover project IDs before creating
> events. Treat events as time entries. Use explicit timezone offsets. Generate
> a stable ID per create intent and reuse it on retries. Read before editing to
> preserve intended time ranges. Follow pagination until nextCursor is null,
> including empty pages. Change only requested fields with PATCH. Event DELETE
> moves data to recoverable trash. Never infer a successful create solely from a
> 409, and never generate a fresh retry ID after an ambiguous response without
> checking the original ID.

## Extending the API

The handler groups routing, editable-field validation, authorization, and
serialization in one file so changes stay easy to inspect. Add editable fields
to the relevant `projectFields`/`eventFields` allowlist and validation, update the
response projection if needed, and update both this guide and the OpenAPI schema.
Keep ownership checks and project validation inside the write transaction: the
Admin SDK bypasses Firestore rules. Existing `aggregateTimeEntry` observes
writes to `timeEntries`; do not separately update summaries in this handler.

Run `npm --prefix functions test` after modifications. Handler tests use an
in-memory Firestore boundary, covering tenancy, event/timer edits, validation,
pagination, retry behavior, and recoverable deletion. They do not contact a live
Firebase deployment or test infrastructure configuration.
