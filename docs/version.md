# Component Versioning

Jass Space releases the frontend and backend independently:

| Component | Software name | Version source | Synchronized metadata |
| --- | --- | --- | --- |
| UI | `sw-lavender` | `version.json` → `ui.version` | `ui/package.json`, `ui/package-lock.json` |
| API | `sw-juniper` | `version.json` → `api.version` | `api/JassSpace.Api/JassSpace.Api.csproj` |

All version commands must be run on the development computer from the repository root. Do not increment versions on the production server. The committed version files are delivered to production through the normal GitHub Actions deployment.

## Check Current Versions

Check that `version.json` and each component's native metadata agree:

```powershell
node scripts/bump-version.mjs check
```

The command prints both current versions and exits with an error if any synchronized file has drifted.

## Choose The Release Type

| Release type | Use when | Example |
| --- | --- | --- |
| Patch | Fixing a bug, security issue, performance problem, or small visual defect without adding a feature | `1.2.3` → `1.2.4` |
| Minor | Adding backward-compatible functionality | `1.2.3` → `1.3.0` |
| Major | Introducing an incompatible behavior, removing functionality, or making a breaking redesign or API contract change | `1.2.3` → `2.0.0` |

The release type is an intentional decision. The script does not try to infer whether a code change is major, minor, or patch.

## UI Release Commands

Use these commands when releasing `sw-lavender`:

```powershell
# Bug fix or other compatible correction
node scripts/bump-version.mjs ui patch

# New backward-compatible UI feature
node scripts/bump-version.mjs ui minor

# Breaking UI change or major incompatible redesign
node scripts/bump-version.mjs ui major
```

A UI bump updates:

- `version.json` → `ui.version`
- `ui/package.json`
- `ui/package-lock.json`

It does not change the API version.

## API Release Commands

Use these commands when releasing `sw-juniper`:

```powershell
# Compatible API bug, security, reliability, or performance fix
node scripts/bump-version.mjs api patch

# New backward-compatible endpoint or capability
node scripts/bump-version.mjs api minor

# Breaking request, response, route, or authentication contract change
node scripts/bump-version.mjs api major
```

An API bump updates:

- `version.json` → `api.version`
- `api/JassSpace.Api/JassSpace.Api.csproj`

It does not change the UI version.

## Prepare A Release

Use this workflow after completing and validating a component change:

```powershell
# From the repository root
git status --short

# Choose exactly one appropriate bump; this example is a UI bug fix
node scripts/bump-version.mjs ui patch

# Confirm all version metadata agrees
node scripts/bump-version.mjs check

# Review the code and version changes together
git diff

# Commit the component change and its version bump together
git add version.json ui/package.json ui/package-lock.json
git commit -m "fix(ui): describe the correction"
git push
```

For an API feature, the corresponding release commands are:

```powershell
node scripts/bump-version.mjs api minor
node scripts/bump-version.mjs check
git add version.json api/JassSpace.Api/JassSpace.Api.csproj
git commit -m "feat(api): describe the capability"
git push
```

Include all affected source files in the same commit or pull request; the focused `git add` examples only show the version metadata files.

## Tags And GitHub Releases

Use component-prefixed tags so UI and API releases cannot collide:

```powershell
# UI release example
git tag -a sw-lavender-v1.0.2 -m "Release sw-lavender v1.0.2"
git push origin sw-lavender-v1.0.2

# API release example
git tag -a sw-juniper-v1.1.0 -m "Release sw-juniper v1.1.0"
git push origin sw-juniper-v1.1.0
```

Create the matching GitHub Release only after the relevant deployment has completed and the component has been verified in production.

If one change releases both components, run one bump command for each component, validate once, commit both version changes together, and create one tag per component after deployment.

## Important Rules

- Bump a component once per release, not once per commit.
- Do not bump the component that was not released.
- Do not edit only a synchronized package or project version; use the bump script.
- Do not run the bump command on the production server.
- Run `node scripts/bump-version.mjs check` before committing and in CI.
- Documentation-only changes do not require a component bump unless they are intentionally part of a component release.

For branch, validation, deployment, and release-note steps, see [Release Process](release-process.md).
