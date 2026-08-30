# Firestore recovery runbook

The app protects ordinary mistakes in three layers:

1. **Recently Deleted (30 days).** The application marks projects and entries with `deletedAt`, `purgeAt`, and a `deletionId`; it does not let a browser physically delete them. Restoring a project restores only the entries moved with that project. An entry independently deleted before the project remains deleted.
2. **PITR (up to seven days).** Use this for accidental writes/deletes that escape the app workflow or for targeted, forensic recovery.
3. **Scheduled backups.** Use a restored, separate database to inspect an older snapshot and selectively copy data back to production.

## Deploy the application recovery controls

The checked-in `firestore.indexes.json` configures TTL on `projects.purgeAt` and `timeEntries.purgeAt`. TTL is asynchronous; eligible documents are generally deleted within about 24 hours, so the app treats the date as the recovery deadline rather than an exact deletion time.

```sh
npm --prefix functions run build
firebase deploy --only functions:aggregateTimeEntry,functions:trashProject,functions:restoreProject,functions:trashTimeEntry,functions:restoreTimeEntry,functions:permanentlyDeleteTrash,firestore:rules,firestore:indexes
```

After deploy, verify both TTL policies appear in the Firestore **TTL** page. If the Firebase CLI version does not apply the `ttl` field override, create the two policies manually in that page: collection group `projects` / field `purgeAt`, and collection group `timeEntries` / field `purgeAt`. Do not add a TTL policy to `deletedAt`.

## Enable PITR and scheduled backups

These steps change billable Google Cloud settings and are deliberately not automated by this repository. They require a billing-enabled project and permissions such as `roles/datastore.owner`.

```sh
gcloud config set project time-tracker-3b6df
gcloud firestore databases update --database='(default)' --enable-pitr

gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=30d

gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=weekly \
  --day-of-week=MON \
  --retention=14w

gcloud firestore backups schedules list --database='(default)'
```

Firestore allows one daily and one weekly scheduled backup, with retention up to 14 weeks. PITR begins retaining versions only after it is enabled; it does not immediately create a seven-day history. PITR and scheduled backup storage both incur charges. Review the selected database’s **Disaster Recovery** page and billing budget alerts after enabling them.

## Recovery procedure

### Normal accidental deletion

Open **Recently Deleted** in the app before its 30-day deadline and select **Restore**. Restore the project first if an entry reports that its project must be restored. “Remove permanently” cannot be undone by the app.

### Recovery within the PITR window

1. Freeze writes for the affected user or place the app in maintenance mode.
2. In Firestore **Disaster Recovery**, identify a timestamp immediately before the mistake. Use PITR to read/export the affected documents or clone the database at that timestamp.
3. Validate the recovered `projects` and `timeEntries` documents in the isolated result, then copy only the intended documents back with an Admin SDK script. Do not overwrite production wholesale.
4. Run `npm --prefix functions run backfill -- --uid <uid>` after recovery, while that user is not editing entries, to rebuild aggregates.
5. Resume writes and confirm totals and ownership rules.

### Recovery from a scheduled backup

1. Restore the backup to a **new** Firestore database in the same project (never over the production database).
2. Inspect and export/copy the required user-scoped documents from that restored database.
3. Import them selectively through a reviewed Admin SDK recovery script; resolve ID collisions intentionally.
4. Rebuild that user’s aggregate summaries with the backfill command above.

References: [PITR](https://cloud.google.com/firestore/docs/pitr), [scheduled backups](https://cloud.google.com/firestore/docs/backups), and [backup-schedule CLI](https://cloud.google.com/sdk/gcloud/reference/firestore/backups/schedules/create).
