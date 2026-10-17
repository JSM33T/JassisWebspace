# Roles and session permissions

## Role model

An account may have several roles, stored in `UserRoles`. The API returns the full `roles` array. The UI uses `hasRole` to decide which controls to show. Its single badge is a display choice: `admin`, then `mod`, then `user`; it does not decide access.

An access token contains the roles present when it was issued, plus the user and session IDs. On every authenticated API request, JWT validation checks the current user and session in the database. A missing, deleted, or inactive user, or a missing or revoked session, makes the request unauthenticated. The API removes token role claims and adds the user's current database roles before authorization runs. Role removal therefore affects the next authenticated request, including changes made directly in the database. If the database check fails, authentication fails closed.

The refresh endpoint also checks the current user and session before rotating a refresh token. A revoked session or inactive or deleted account cannot obtain a new access token. Refreshing reads the current roles.

## Browser state

Password login and OAuth login retain the complete role list. On browser restore, the UI calls `/auth/me` before using saved account details. After a client token refresh, it calls `/auth/me` again and updates the saved user. If current account details cannot be loaded, it clears the saved browser session. The API remains the permission boundary; hidden UI controls alone do not protect endpoints.

## Access-token lifetime

The intended value for `JWT__ExpiryMinutes` is 15 in local, example, and deployment environments. The API default and checked-in configuration are also 15 minutes. The production Compose override sets the container value to 15, taking precedence over the host's `.env` file. The running production container needs to be recreated during rollout for this value to take effect. Database-backed authorization checks enforce role and session changes even during an access token's remaining lifetime.

## Artifacts

Artifact management requires `admin` or `mod`. Admins manage all artifacts; moderators can list and manage only their own. This ownership boundary also applies to Artifact records in the shared Content library and content search. Ordinary accounts have no management access. Removing a management role takes effect on the next authenticated request through the existing role validation pipeline.

Recipients do not sign in: a valid share capability permits metadata access and download redemption. Expiry, revocation, and per-link download allowances are checked in the API/database. Recipient grants do not grant management access. Existing shares remain valid after uploader demotion unless revoked or the artifact is deleted; demotion removes management privileges, not previously issued recipient capabilities.
