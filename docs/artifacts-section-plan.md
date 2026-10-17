# Artifacts section plan

Implemented in source. The user requested that the uploaded entity be named `Artifact` and registered in the shared Content system. The confirmed recipient policy is anonymous downloading through a valid link; management requires `admin` or `mod`.

## Delivered scope

- `Artifact`, `ArtifactShareLink`, and `ArtifactDownloadGrant` entities, EF configuration, migration, and model snapshot.
- `ContentType.Artifact = 5`, a content record and uploader author association for each upload, and Artifact integration in the admin Content library and its filters.
- Admin management of all artifacts, moderator management of their own artifacts, and equivalent ownership enforcement in admin content queries.
- Private Azure storage with upload streaming, configurable upload size and owner quota, safe attachment downloads, and no public blob links.
- Atomic file replacement with hidden staging, old-file cleanup, preserved identity/links/counts, and authenticated personal downloads that do not consume share allowances.
- Multiple independent share links per artifact, optional expiry, optional maximum downloads, unlimited settings, editing, usage counts, permanent revocation, and permanent deletion of revoked links.
- Atomic download reservations with idempotent retries, expiring grants, range support, and a concurrent-transfer cap per grant.
- Admin upload/list/detail screens with search, uploader filters, progress/cancellation, private notes, creation-time URL copying, and deletion controls.
- A minimal anonymous recipient page using fragment-based share URLs so secrets do not enter web-server request URLs.
- Immediate access removal, retried storage deletion, permanent artifact/content deletion with related-record cascades, cleanup of legacy tombstones, abandoned-upload recovery, grant retention, and audit retention through Hangfire.
- Environment configuration and rollout documentation.

## Counting semantics

Opening a share page or generating a preview consumes no use. A deliberate download reserves one use. Transfer retries within that grant reuse the allowance; abandoned transfers remain counted. Time expiry, revocation, and deletion block subsequent byte requests, including requests using existing grants. Exhausting the allowance does not cancel grants already issued.

## Verification and rollout

The API and UI Docker builds and the UI TypeScript check pass. The live PostgreSQL foreign keys were inspected to confirm cascades for links, grants, content authors, comments, likes, and views. The local API has been rebuilt and restarted during follow-up debugging. No automated test suite or production deployment was performed.

The deployment requires the new migration, a separate private Azure container, a persistent writable Data Protection key directory, and proxy limits permitting 101 MiB multipart requests. See [Artifact sharing](artifacts.md) for the actual API, defaults, operational behavior, and deployment steps.

## Outside this version

Passwords, invited recipients, folders, bulk uploads, inline previews, antivirus quarantine, automatic deletion on share expiry, and public searchable artifact listings remain outside the agreed initial scope.
