# Role handling and permission changes

## Goal

Support accounts with more than one role without depending on role order. Make role removals, account deactivation, and session revocation effective on the next authenticated API request. Keep the browser's role display in sync with the API.

## Baseline findings (before these changes)

- The API loads all assigned roles, returns them in `user.roles`, and puts each role in the access token. It does not define an order for the response array.
- The UI used `roles[0]` as a single `user.role`, which could hide Admin controls for an account with both `user` and `admin`.
- Browser restore reused a saved role without checking `/auth/me`.
- JWT validation checked signature and lifetime but did not check current roles, account status, or session revocation. The local access-token lifetime was 120 minutes.
- Token refresh did not reject an inactive or deleted user or a revoked session.

## P0: Make the UI handle all roles

- [x] Change the shared `User` state to retain `roles: string[]` from the API. Add a shared `hasRole` helper and use it for capability checks.
- [x] Replace every `roles[0]` conversion in password login, OAuth callback, session restoration, and profile updates. Do not silently assign `user` when the API omits roles.
- [x] Replace checks against the single `user.role` in the admin layout, navigation, and blog, gallery, and comment controls with checks against the full role set.
- [x] Derive a display label separately, using `admin`, then `mod`, then `user` priority. Display priority must never determine authorization.
- [x] Refresh user details from `/auth/me` after token refresh and when restoring a browser session; update or clear saved user state when it no longer matches the API.

## P0: Enforce current permissions in the API

- [x] In JWT validation, load the current user and the token's session. Reject tokens for missing, deleted, or inactive users and for missing or revoked sessions.
- [x] Use the user's current database roles for authorization on each authenticated request, rather than the roles frozen in the JWT. Remove stale role claims before adding current ones. Fail closed if the check cannot be completed.
- [x] In refresh-token handling, reject deleted or inactive users and revoked sessions before rotating the token or issuing a new access token.
- [x] Confirm that role updates through the admin API take effect on the next request. Direct database role changes must have the same effect.

## P1: Reduce the stale-token window

- [x] Set a consistent short access-token lifetime (target: 10–15 minutes) in local, example, and deployment configuration. Local `.env`, `.env.example`, `appsettings.json`, and `docker-compose.prod.yml` now set or force 15 minutes.
- [x] Document the role model, session validation behavior, and how the UI refreshes permissions in `docs/auth-permissions.md`.
- [x] Hide admin-only sidebar links and dashboard cards from `mod` accounts, and redirect moderators who visit admin-only pages directly.

## Acceptance criteria

- [x] An account with both `admin` and `user` shows Admin controls and can open `/admin`; authorization checks the full role set rather than array order.
- [x] An account with only `user` cannot use admin endpoints or open the admin UI.
- [x] Removing `admin` from a signed-in account blocks its next admin API request, including when the change is made directly in the database.
- [x] Deactivating or deleting an account, or revoking its session, blocks authenticated API requests and token refresh.
- [x] A browser session reload updates its displayed roles from `/auth/me` and does not retain a stale role from local storage. The token refresh path also fetches `/auth/me` and the API refresh response contains current roles.

## Verification status

- The UI TypeScript check and Docker image build completed successfully. The API Docker build completed with zero warnings and zero errors. Local API and UI containers were recreated with the changed images.
- Live local API checks used four temporary accounts and covered multiple roles, user-only and moderator access, admin API role removal, direct database role grant and removal, refresh after a role grant, inactive and deleted users, and revoked sessions. All checks passed; the temporary accounts were removed.
- Browser checks covered admin/user, user-only, and moderator navigation; role display changed after demotion and promotion followed by page reload. Moderator dashboard cards and direct admin-only page access were checked after the final UI rebuild.
- The effective production Compose configuration sets `JWT__ExpiryMinutes=15`. The production service has not been redeployed, so its running value has not been verified.

## Remaining work

1. During the next production rollout, recreate the API container with `docker-compose.prod.yml` and verify its effective `JWT__ExpiryMinutes` is `15` and the health endpoint responds. Production deployment access is not available in this workspace.

## Relevant code

- API role loading and response: `api/JassSpace.Services/AuthService.cs`
- JWT creation and validation: `api/JassSpace.Api/Services/JwtService.cs`, `api/JassSpace.Api/Extensions/AuthExtensions.cs`
- Admin role updates: `api/JassSpace.Repositories/UserRepository.cs`
- UI user state and login: `ui/contexts/UserContext.tsx`, `ui/app/login/page.tsx`, `ui/app/account/oauth/callback/page.tsx`
- UI role checks and admin navigation: `ui/lib/auth-roles.ts`, `ui/app/admin/layout.tsx`, `ui/app/admin/page.tsx`, `ui/components/admin/sidebar.tsx`, `ui/components/navbar/account-controls.tsx`
