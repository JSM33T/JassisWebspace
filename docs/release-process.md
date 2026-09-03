# Release Process

This process turns a validated change on `dev` into a production deployment on `main`, then records the outcome as a GitHub release. It follows the repository's existing branch and deployment automation rather than adding a parallel release mechanism.

## Versioning

The UI (`sw-lavender`) and API (`sw-juniper`) use independent Semantic Versions. Select and increment the affected component from the repository root before merging the release:

```powershell
node scripts/bump-version.mjs ui patch
node scripts/bump-version.mjs ui minor
node scripts/bump-version.mjs ui major

node scripts/bump-version.mjs api patch
node scripts/bump-version.mjs api minor
node scripts/bump-version.mjs api major

node scripts/bump-version.mjs check
```

| Change type | Version change | Example |
| --- | --- | --- |
| Breaking public behavior or migration requiring coordination | Major | `v2.0.0` |
| New backward-compatible feature | Minor | `v1.4.0` |
| Bug fix, documentation, or low-risk improvement | Patch | `v1.4.1` |

The current version tool accepts stable `major.minor.patch` versions only. See [Component Versioning](version.md) for selection rules and complete command examples.

## Release Checklist

1. Confirm the intended work is merged into `dev` and the branch is clean.
2. Review the changes, migrations, environment additions, and user-facing notes.
3. Validate affected areas locally:

```powershell
# API, from api/
dotnet restore JassSpace.sln
dotnet build JassSpace.sln --configuration Release
dotnet test JassSpace.sln --configuration Release

# UI, from ui/
npm ci
npm run lint
npm run build
```

4. Merge `dev` into `main` using the normal reviewed branch workflow.
5. Push `main` and wait for any path-matched production deployment workflows to finish.
6. Verify the live UI, API, and affected user journey after deployment.
7. Create the component-prefixed version tag and GitHub release after production verification.

## Deployment Expectations

Pushing to `main` deploys only when changed paths match a deployment workflow:

| Changed area | Workflow |
| --- | --- |
| `api/`, Compose files, or .NET workflow | `deploy-dotnet.yml` |
| `ui/`, Compose files, or Next.js workflow | `deploy-nextjs.yml` |

Both workflows validate before deployment and serialize production changes through the shared deployment concurrency group and remote lock. A Git tag does not trigger deployment; it records the verified release after the `main` deployment has succeeded.

## Release Notes

Create the GitHub release from the new tag and write concise notes under these headings when applicable:

```text
## Highlights
- User-visible improvements.

## Fixes
- Resolved defects and regressions.

## Operations
- Migration, configuration, or deployment notes.

## Upgrade Notes
- Required actions for operators or API consumers.
```

Avoid copying internal implementation details, secrets, or unverified claims into release notes. Link issues, pull requests, or development-wall items when that helps users understand a change.

## Creating A Tag

After `main` is deployed and verified, tag the released component. For example:

```powershell
git switch main
git pull --ff-only origin main
git tag -a sw-lavender-v1.2.3 -m "Release sw-lavender v1.2.3"
git push origin sw-lavender-v1.2.3

git tag -a sw-juniper-v1.4.0 -m "Release sw-juniper v1.4.0"
git push origin sw-juniper-v1.4.0
```

Create a matching GitHub Release using the tag for the component that was released. If both components were released, create and publish both component tags.

## Hotfixes

For an urgent production problem:

1. Branch from the current `main` commit.
2. Make the smallest corrective change and run focused validation plus the normal affected build/test checks.
3. Merge the hotfix into `main` and verify the automatic deployment.
4. Merge or backport the same fix into `dev` so the branches do not diverge.
5. Create the next patch release tag and release notes after verification.

Use a source-controlled revert for a failed release when possible. The deployment host always resets to `origin/main`, so server-side source edits are not a reliable rollback method.

## Ownership And Records

The person merging to `main` owns verifying the matching deployment workflow. The person creating the tag owns ensuring the release notes describe the version that is actually deployed. Record any manual follow-up or known limitation in the GitHub release.

For deployment details and rollback guidance, see [Deployment Guide](deployment.md). For common operational failures, see [Troubleshooting](troubleshooting.md).
