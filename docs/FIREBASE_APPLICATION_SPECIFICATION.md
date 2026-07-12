# TimeTracker Firebase Application Specification

## Purpose and scope

This document describes the behavior and Firebase contract implemented by the web application in `web-app/`. It is intended to let another client—for example, an iOS/Xcode app—implement compatible functionality against the same Firebase project without depending on the web UI or its TypeScript code.

The source of truth for persisted data is Cloud Firestore. Firebase Authentication supplies the authenticated user identity. The repository now includes a Cloud Functions aggregation worker, which must be deployed and backfilled before clients use its aggregate documents. There is no conventional server/API layer, Firebase Storage, or user-profile writes.

## Firebase services and configuration

| Service | Current use |
| --- | --- |
| Firebase Authentication | Email/password account creation, sign-in, sign-out, and auth-state observation. |
| Cloud Firestore | Projects and time-entry persistence, one-shot reads, and real-time listeners. |
| Cloud Functions (2nd gen) | Trusted `timeEntries` aggregation worker; source is checked in but deployment/backfill is pending. |

The web client initializes Firebase using these public environment values: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`.

These configuration values identify the Firebase project; they are not authorization secrets. Access control is enforced by Firebase Auth plus Firestore Security Rules.

## Authentication contract

### Supported operations

| Feature | Firebase operation | Result |
| --- | --- | --- |
| Restore session | Auth-state listener | Supplies either the signed-in `User` or `null` while the app starts. |
| Sign up | `createUserWithEmailAndPassword(email, password)` | Creates an email/password Firebase Auth account. The UI requires matching passwords and at least six characters. |
| Sign in | `signInWithEmailAndPassword(email, password)` | Establishes an authenticated session. |
| Sign out | `signOut()` | Ends the session. |

### Identity usage

The Firebase Auth UID is the tenancy key. Every project and time entry must contain `userId` equal to `auth.uid`. A client must not infer ownership from an email address or from a project ID alone.

There is a `UserProfile` TypeScript type in the repository, but no `users`/profiles collection is presently created or read. A compatible client should therefore rely on the Firebase Auth user object for account identity unless a profile feature is introduced separately.

## Firestore data model

The current schema uses two top-level collections. Timestamps are Firestore `Timestamp` values on the wire and should be converted to platform date types in clients.

### `projects/{projectId}`

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | string | Yes | User-visible project name; rules require 1–100 characters. |
| `color` | string | Yes | Hex color in `#RRGGBB` form. |
| `userId` | string | Yes | Owning Firebase Auth UID. |
| `isPinned` | boolean | Effectively yes | Whether the project appears in the pinned views. New projects start as `false`. |
| `createdAt` | timestamp | Yes | Server timestamp at creation. |
| `updatedAt` | timestamp | Yes | Server timestamp on every update. |

### `timeEntries/{entryId}`

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `projectId` | string | Yes | ID of the related project. This is an application-level reference, not a Firestore `DocumentReference`. |
| `userId` | string | Yes | Owning Firebase Auth UID. |
| `startTime` | timestamp | Yes | Start instant. |
| `endTime` | timestamp or `null` | Optional | End instant. Active timers are stored with `null`/no usable end time. |
| `description` | string | Optional | Free-text work note. |
| `isActive` | boolean | Yes | `true` while the timer is running; `false` for completed/manual entries. |
| `createdAt` | timestamp | Yes | Server timestamp at creation. |
| `updatedAt` | timestamp | Yes | Server timestamp on every update. |

### Data invariants clients should preserve

- A project and each of its entries belong to the same authenticated user.
- A normal completed entry has `isActive: false` and an `endTime` after `startTime`.
- A running timer has `isActive: true` and no end time (the web client writes `null` when creating it).
- The UI assumes, but the database does not enforce, at most one active entry per user.
- `createdAt` is set once with a server timestamp; every mutation overwrites `updatedAt` with a server timestamp.
- Project deletion currently does **not** delete related time entries. Existing entries become orphaned and views that need the missing project omit them. Do not rely on deletion as a cascade.

## Security and authorization

Firestore rules require authentication for every permitted operation. Reads, updates, and deletes are allowed only if the existing document's `userId` matches `request.auth.uid`; creates require the incoming `userId` to match. Updates cannot transfer ownership.

Rules validate project names, colors, timestamp fields, entry `projectId`, and the types of `isActive`, `description`, and `endTime`. They do not currently verify that `projectId` points to an existing project owned by the caller, that entries have non-negative durations, or that a user has a single active timer. A non-web client should enforce those application invariants before writing; a future backend design should enforce the critical ones centrally.

### Aggregate documents

The aggregation worker maintains `users/{uid}/summaries/overview`,
`users/{uid}/dailySummaries/{YYYY-MM-DD}`, and
`users/{uid}/projectSummaries/{projectId}` from time-entry writes. These
documents contain completed-session counts and integer duration seconds;
active timers are excluded until stopped. Daily buckets use UTC, including
splitting entries that cross UTC midnight. A session is counted once on the UTC
date of its end time. Clients may render timestamps in a user's local timezone,
but aggregate date keys remain UTC.

Clients may read only their own aggregate documents and cannot write them.
The worker uses an Admin SDK transaction plus a private event ledger so a
replayed Firestore event cannot double-count totals. The worker source is
present in `functions/src/index.ts`. Historical entries can be rebuilt per user
with `npm --prefix functions run backfill -- --uid <Firebase Auth UID>` after
using `gcloud auth application-default login`; do not run that rebuild while
the target user is writing entries.

## Query and real-time subscription contract

The current web client queries global collections and filters by `userId`.

| Data needed | Firestore query | Current ordering/selection |
| --- | --- | --- |
| All projects | `projects` where `userId == uid` | All matching documents; client sorts by `createdAt` descending. |
| All time entries | `timeEntries` where `userId == uid` | All matching documents; client sorts by `startTime` descending. |
| Active timer | `timeEntries` where `userId == uid` and `isActive == true` | Reads the first returned document; no explicit ordering or single-result constraint. |

Each query exists as both a one-shot `getDocs` helper and a real-time `onSnapshot` subscription helper. The application’s screens use the subscriptions. A snapshot conversion maps Firestore timestamps to native dates, using the current time as a fallback if a server timestamp is still unresolved.

The checked-in composite indexes support future server-side ordering/filtering for entries by `userId` + `startTime`, entries by `userId` + `projectId` + `startTime`, active entries by `userId` + `isActive`, and projects by `userId` + pinned/name or created date. The current service code does not yet use `orderBy`, date bounds, limits, or pagination.

## Functional behavior

### Project management

| Feature | Persisted operation |
| --- | --- |
| Create project | Add a project with selected name/color, current user ID, `isPinned: false`, and server timestamps. |
| Edit project | Update name and/or color; `updatedAt` changes. |
| Pin/unpin project | Update `isPinned`. |
| Delete project | Delete only the project document; no entry cleanup occurs. |
| Browse/search projects | Uses the live project set. Search, pinned-only filtering, grid/list choice, and grouping are client-side UI behavior. |
| Pinned screen | Filters the live project set to `isPinned == true`; each card calculates its lifetime time from currently loaded entries. |

### Timer tracking

1. Starting a project creates a time entry with the current device time as `startTime`, `isActive: true`, no `endTime`, the selected `projectId`, and the current UID.
2. If another project is already active, the UI asks for confirmation; on confirmation it stops the existing timer before starting the new one.
3. Stopping updates the active entry with current device time as `endTime` and `isActive: false`.
4. Active elapsed time is calculated locally from `startTime` and refreshed every second. It does not write every second.
5. The active timer can be stopped or have its start time edited from the dashboard/full-screen timer.

### Manual entries and entry management

| Feature | Behavior |
| --- | --- |
| Manual entry dialog | Creates a completed entry for a chosen date, project, start time, end time, and optional description. The end must be later than the start. |
| Calendar quick entry | Double-clicking a time slot opens a prefilled one-hour completed entry for that date/time. The most recently used project is preselected when possible. |
| Most recently used project | Derived from the first entry in the locally sorted all-entry list; otherwise uses the first pinned project, then first project. |
| Edit entry | Updates start time, optional end time, and description. The generic update helper converts supplied dates to Firestore timestamps. |
| Delete entry | Deletes the entry document after UI confirmation. |
| Time-entry history | Filters the locally loaded all-entry list by project, text (project name/description), and period (past 7 days, current week, month, all). |
| Time breakdown chart | Aggregates the locally filtered entries by project; active entries count from start until now. |
| Calendar | Builds day/week/custom-range timelines locally from all loaded entries. Dragging moves an entry; resizing changes its start or end. The minimum duration is five minutes and edits are clamped to the displayed day. |

### Dashboard statistics

The dashboard calculates all statistics from the entire locally subscribed `timeEntries` collection:

- total projects and number pinned;
- completed sessions whose **end date** is in the current locale week, and their rounded total minutes;
- total number of entries; and
- entries with no end time, shown as active.

This is functional at small data sizes but is not a scalable reporting API. The recommended replacement is specified in `FIRESTORE_SCALING_AND_AGGREGATION_PLAN.md`.

### Local-only preferences

Theme (light/dark), accent color, and full-screen timer background are stored in browser local storage. They are not synchronized with Firebase and an iOS client need not reproduce them unless cross-device preferences are desired.

## Client implementation guidance

A compatible client should centralize its Firestore listeners in an app/session data store instead of allowing each visual component to attach independent listeners. It should use the authenticated UID as the only tenant scope, use server timestamps for audit fields, unsubscribe listeners when views/session end, and issue bounded/paginated entry queries for history/calendar screens.

For iOS, use Firebase Auth's email/password APIs and Firestore's snapshot listener APIs with the same collection names and fields. Convert `Timestamp` to `Date`, preserve nullable `endTime`, and surface Firebase permission/network errors to the user. Do not expose Admin SDK credentials in a client app.

## Current limitations to account for

- The web UI still uses legacy full-history reads until its client refactor lands; aggregates are currently a backend foundation and must be backfilled per existing user before client adoption.
- No backend-level protection against multiple active timers.
- No referential integrity or deletion cascade for projects.
- No user profile document despite the unused `UserProfile` type.
- No pagination, date-window querying, or server-side query ordering in the current web implementation.
- Client clocks supply start/end times, so timestamps can differ between devices.
- Every component that invokes `useTimeTracking()` currently attaches three live listeners. This can duplicate reads on a single screen; the scaling plan includes a required provider/store refactor.
