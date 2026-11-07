# Saved content implementation plan

Date: 2026-11-07

Branch: `improvements_nov`

## Goal

Let signed-in users save published blog posts, active gallery albums, and published music tracks. Each save uses the shared `Content.Id`, is private to the user, and appears in a paginated **Saved** page. Saving is independent of liking and has no public counter.

## Data model

`SavedContents` is the join table between users and shared content. Its composite primary key makes repeated saves idempotent.

| Column | Type | Purpose |
| --- | --- | --- |
| `UserId` | UUID | Owner; cascades on hard user deletion. |
| `ContentId` | UUID | Shared content item; cascades on hard content deletion. |
| `CreatedAt` | UTC timestamp | Save time and list order. |

Keep an index on `(UserId, CreatedAt DESC, ContentId DESC)` for the library and one on `ContentId` for content deletion. Soft-deleted users have their saves removed by account cleanup. No content edit tracking is needed for bookmarks.

## API

All endpoints require authentication, use the current user ID from the validated token, and return `Cache-Control: private, no-store`. The service checks that content and its underlying blog, album, or track are visible before exposing save status or listing it.

| Endpoint | Behavior |
| --- | --- |
| `PUT /saved-content/{contentId}` | Save a visible item; repeated calls retain the original save time. |
| `DELETE /saved-content/{contentId}` | Remove the current user's save; repeated calls succeed. |
| `GET /saved-content/{contentId}/status` | Return `contentId`, `isSaved`, and `savedAt`. |
| `POST /saved-content/status` | Batch status lookup for 1–100 content IDs. |
| `GET /saved-content` | Paginate visible saves, optionally filtered by Blog, Album, or Music. |

List items return the shared content ID, type, title, description, cover, public route, and save time. Build public routes from the current domain slug, because `Content.Slug` can differ from the blog, album, or track slug. Hidden items stay saved but do not appear until republished; they can still be removed by ID.

## UI

Use one `SaveButton` on the supported detail and listing cards, near like and comment actions. Guests are directed to login and back to the content. The provider batches status requests, keeps controls consistent, and clears state when accounts change.

The private `/account/saved` page has type filters, pagination, and links to content. Its trash button asks for confirmation before removing an item from the saved list. Include Saved links in desktop and mobile account navigation. Keep the page out of public search indexing.

## Validation

Backend tests cover per-user isolation, idempotent save and remove, shared IDs, visibility restrictions, and current public slugs. Verify the migration and its indexes against PostgreSQL. UI checks cover guest login, save state after reload, list filters and pagination, confirmation before removal, rapid clicks, account switching, and failed requests.

The original saved-content migration also introduced content revisions. It was applied in the local development database, so migration history must be retained. The follow-up `RemoveContentRevisions` migration removes that schema while preserving existing `SavedContents` rows. Rebuild and restart the API with migrations enabled before using the simplified API against the local database.
