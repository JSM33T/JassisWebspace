# Artifacts

Artifacts are private uploaded files registered as `ContentType.Artifact` (enum value 5). Every Artifact has a shared Content record and uploader author association. Artifacts appear in the admin Content library and have links to their management screen. Their content records stay unpublished, and public search explicitly excludes this type. Private notes are never copied into shared content metadata. Public likes, comments, and anonymous view recording are disabled for Artifacts; share download counts are tracked independently.

## Permissions and routes

- Admins manage every artifact; moderators manage their own artifacts and links. Other accounts have no management access. Ownership is enforced by the API, including the Content library and admin content search.
- `/admin/artifacts`: paginated list, search, uploader filtering for admins, and upload with progress/cancellation.
- `/admin/artifacts/{id}`: details, private note, content record, file replacement, personal download, link creation/settings/revocation, usage and deletion.
- `/artifacts/share#<secret>`: recipient page, usable without an account. The URL fragment is not sent to web servers or in referrers. Link previews contain generic page metadata and never consume a use.
- Share links cannot be recovered from their stored hashes. Copy the URL immediately after creation; otherwise create a new link. New links do not revoke existing links.

## Sharing rules

Each link has an optional UTC expiry and optional positive download allowance. Leaving both unset makes it unlimited. Expiry or allowance exhaustion blocks new download sessions, whichever happens first. Settings edits preserve counters and may reactivate expired/exhausted links; revocation is permanent. Individual links have independent counts. Revoked links can be permanently deleted; their download grants and encrypted retry tokens are removed by database cascade. Active links must be revoked first. Artifact totals reflect the links still saved for that artifact.

Viewing or refreshing the recipient page consumes no use. Clicking Download reserves one session in a database transaction, even if the transfer is later abandoned. Repeated requests with the same request ID return the same grant and do not consume another use. The browser preserves that ID after network failures. Page reloads start a new attempt and may consume another use.

A grant lasts 15 minutes by default, capped by the link's expiry. Grant retries and ranged GET/HEAD requests do not consume further uses. Exhausting a link does not invalidate its already reserved grants. Revocation, deletion, or time expiry blocks subsequent requests using existing grants. Data already transmitted or saved cannot be recalled, and already running responses are allowed to finish. Up to two transfers per grant may run concurrently. An API process crash can leave those slots occupied until the grant expires; a new download session is then needed.

The default recipient page submits a normal HTML form so the browser can stream to disk. In this flow, download secrets are POST body values rather than URLs. The retry button reuses the same grant. An expired session requires a page reload and a new redemption. Browser download UI reports transfer errors; the page reports that a download was requested rather than claiming transfer completion.

## Direct download links

Normal share links keep opening the recipient page. Add `?directdl=true` **before the fragment** to start a download automatically: `/artifacts/share?directdl=true#<secret>`. The browser forwards to the API without loading artifact metadata or asking the recipient to click Download.

For a direct HTTP download URL, use the API origin with `/artifact-shares/<secret>?directdl=true`. The link creation dialog offers **Copy direct download link** alongside the normal share URL. Both URLs use the same share and allowance. Without the flag, or with `directdl=false`, this API URL redirects to the usual recipient page.

A direct GET reserves one download and redirects to `/artifact-downloads/<grantToken>`, which serves an attachment. Range requests and retries using that final session URL reuse its allowance. Opening the original direct link again reserves another session, including automated clients that issue GET requests. HEAD requests inspect availability and metadata without consuming an allowance. Expiry, revocation, deletion, replacement and concurrency checks continue to apply.

## Replacing and downloading your own artifact

Authorized managers can use **Replace file** on the artifact detail screen. The existing artifact ID, shared Content record, title, private note, uploader, links, expiry settings and counters are preserved. Filename, media type, size and modification time update to match the replacement.

The replacement uploads into a hidden staging artifact with its own opaque storage key. The original remains available until upload completes. A database transaction switches the storage keys and metadata atomically; the staging record then owns the previous file and is deleted through the same durable storage/content cleanup path. Failed uploads or conflicting replacements preserve the live file and queue staging cleanup. Abandoned staging records are recovered after two hours. Both files count toward the owner's storage quota until old-file deletion completes, so enough free quota is needed for the entire new upload. Hidden staging artifacts do not appear in the management list or Content library.

Existing public share links continue to work and their download counts do not reset. Existing download grants are invalidated at replacement to prevent range requests from mixing old and new bytes. A recipient must start a new session, which consumes another allowance; exhausted links remain exhausted until the manager changes their limits or issues a new link. Downloads already running may be interrupted when the previous blob is removed.

**Download for myself** uses the authenticated management endpoint: admins may download any ready artifact, and moderators only their own. It works regardless of whether share links exist, have expired, or are exhausted, and it does not create a grant or change share counters. The API serves the file as an attachment and records a manager download audit event. The manager UI buffers the bounded file (at most 100 MiB) to a browser Blob to attach bearer authentication without putting credentials in a URL; cancellation is available. Public recipient downloads continue to stream through the browser's normal form download flow.

## API

Management endpoints require bearer authentication and the current `admin` or `mod` role:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/artifacts?search=&page=1&pageSize=20&owner=` | List; admin-only optional uploader filter |
| POST | `/admin/artifacts` | Multipart `file`, optional `title`, `privateNote` |
| GET | `/admin/artifacts/{id}` | Artifact and share link details |
| GET | `/admin/artifacts/content/{contentId}` | Resolve an authorized content record to its artifact |
| PUT | `/admin/artifacts/{id}` | `{ title, privateNote }` |
| POST | `/admin/artifacts/{id}/file` | Multipart `file`; replace bytes while preserving identity and links |
| GET | `/admin/artifacts/{id}/download` | Authorized manager download; bearer authentication, no share allowance |
| DELETE | `/admin/artifacts/{id}` | Disable access, then remove stored bytes |
| POST | `/admin/artifacts/{id}/links` | `{ expiresAt, maxDownloads }`; returns raw token once |
| PUT | `/admin/artifacts/{id}/links/{linkId}` | Update expiry/allowance |
| POST | `/admin/artifacts/{id}/links/{linkId}/revoke` | Permanently revoke |
| DELETE | `/admin/artifacts/{id}/links/{linkId}` | Permanently remove a revoked link and its grants |

Anonymous capability endpoints:

| Method | Path | Capability |
| --- | --- | --- |
| GET | `/artifact-shares` | `X-Artifact-Token` header; minimal valid-share metadata |
| POST | `/artifact-shares/redeem` | Same header and JSON `{ idempotencyKey: "<uuid>" }` |
| GET / HEAD | `/artifact-shares/{token}?directdl=true` | Direct link; GET reserves a session and redirects, HEAD only inspects metadata; omit the flag for the normal share page |
| POST | `/artifact-downloads` | Form-urlencoded `grantToken`; attachment response |
| GET / HEAD | `/artifact-downloads` | `X-Artifact-Grant` header; Range supported for GET |
| GET / HEAD | `/artifact-downloads/{grantToken}` | Reserved direct-download session; Range supported for GET |

Unknown shares/grants return 404; known unavailable/expired capabilities return 410. Invalid settings return 400; upload size violations 413; exceeded owner quota 409; rate/concurrency limits 429. Storage/database failures fail closed and return a generic 503. Cross-owner management lookups return 404. Download capabilities never authorize management.

## Persistence and storage

The EF migration `20261017090000_AddArtifacts` creates Artifacts, ArtifactShareLinks, and ArtifactDownloadGrants with foreign keys, token uniqueness, positive-limit constraints, and a unique share/request-ID pair. Redemption locks the artifact then the share row, reads database time, checks restrictions, increments the count, and saves a grant atomically. Edits, revocation, deletion and byte request authorization use the same lock order. Concurrent single-use redemptions issue only one grant.

Share tokens are random 256-bit capabilities stored as SHA-256 hashes. Grants have a hash plus an encrypted replay token for idempotency, using ASP.NET Data Protection. Encryption keys must persist across API restarts and be shared by replicas. Do not log custom capability headers, form bodies, response bodies containing new capabilities, or browser URL fragments.

Direct HTTP links and their redirect destinations carry capabilities in URL paths. The API redacts those path segments in its request logging context. Configure reverse-proxy/access-log redaction for `/artifact-shares/<secret>` and `/artifact-downloads/<grantToken>` as well, and exclude their redirect `Location` headers from logging. Direct links should be treated as private bearer credentials, just like normal share links.

The dedicated `artifacts-private` Azure container must differ from the media container. It is created without anonymous access, and uploads reject a container with public access enabled. Bytes are streamed to Azure without image processing, full-file memory buffering, public blob links, or the generic media cache. All downloads are attachments served as `application/octet-stream` with `nosniff`. Original names are sanitized; storage keys are generated independently.

Configuration (environment variables use `__` separators):

| Setting | Default |
| --- | --- |
| `Artifacts:ContainerName` | `artifacts-private` |
| `Artifacts:MaxUploadBytes` | 104857600 (100 MiB; configurable downward) |
| `Artifacts:OwnerQuotaBytes` | 2147483648 (2 GiB per uploader) |
| `Artifacts:GrantLifetimeMinutes` | 15; supported range 1–60 |
| `Artifacts:DataProtectionKeyDirectory` | `/app/cache/artifact-keys` |

Use the existing `AzureBlobStorage:ConnectionString`. Its identity needs private-container creation/access-policy read and blob read/write/delete permissions. In Docker, the existing `dotnet-media-cache` volume persists the default key directory and the API image grants its non-root user access to `/app/cache`. Development defaults to `.data/artifact-keys` beneath the API content root when the setting is absent. When running outside Docker in other environments, configure a writable persistent key directory. Protect/backup the key directory; loss affects grant retries. Blob download authorization still fails closed.

Upload multipart requests may spill to the framework's temporary directory instead of memory. The reverse proxy must allow **101 MiB** request bodies for multipart overhead; the actual file limit remains 100 MiB or the lower configured limit. Set a sufficient proxy upload timeout. Configure matching HTTPS frontend/API URLs, as browsers block an HTTPS page from posting downloads to HTTP.

## Lifecycle and cleanup

Uploads reserve owner quota transactionally, including pending uploads, and register content before streaming to storage. Failed uploads are marked for cleanup; abandoned uploads older than two hours are also recovered. Deletion first disables access transactionally, then attempts physical deletion. The `artifact-cleanup` Hangfire job runs every 15 minutes and retries pending deletions, purges grants expired for over one day, and purges Artifact audit events older than 90 days. It does not reset durable counters or automatically delete artifacts when links expire. After storage deletion succeeds, the artifact row and shared Content row are permanently deleted in one database transaction. Artifact deletion cascades to all share links and grants; Content deletion cascades to authors, comments/replies, likes, and views. Quota is released with that purge. Legacy soft-deleted rows are also purged by the cleanup job. If storage deletion fails, the inaccessible DeletionPending row retains the storage key so cleanup can retry without orphaning the blob. Minimal audit events containing internal IDs remain for the normal 90-day retention; they do not retain share secrets or file contents. Artifacts are not Blog entities, and blog posts are not deleted.

Audit events cover uploads, file replacements, manager downloads, details edits, link creation/settings/revocation/deletion, artifact deletion and redemption. They contain internal IDs, not capabilities or private file contents. Deleting an uploader leaves a nullable owner; only admins can manage those retained artifacts. Existing recipient capabilities persist after uploader role removal until their own restrictions end or an admin revokes/deletes them.

## Rollout

1. Apply the migration using the repository's normal EF deployment flow or its explicitly configured startup migration mechanism.
2. Configure the dedicated private container and persistent writable Data Protection key directory. Defaults use the existing Azure connection and Docker volume.
3. Permit 101 MiB uploads and an appropriate timeout at the reverse proxy. Preserve no-store, no-referrer, noindex and nosniff response headers, and do not enable request/response body or custom capability-header logging on these endpoints.
4. Deploy the API and UI together so the Artifact enum, content screens and routes agree.

During follow-up debugging, the local API was rebuilt and restarted successfully. The API and UI Docker builds and the UI TypeScript check pass, and the live PostgreSQL cascade constraints were inspected. The automated test suite and a full browser flow were not run; no production deployment was performed.
