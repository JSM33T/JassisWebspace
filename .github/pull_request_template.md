## Summary

<!-- Explain the change and the user or operational value. -->

## Related Work

<!-- Link issues, development-wall items, or deployment incidents. Use "None" when not applicable. -->

## Validation

<!-- Mark the checks you actually ran. -->

- [ ] `dotnet test JassSpace.sln --configuration Release` (API changes)
- [ ] `npm run lint` (UI changes)
- [ ] `npm run build` (UI changes)
- [ ] Manual verification of the affected user flow

## Impact

- [ ] No database migration
- [ ] Includes a database migration; rollout notes are below
- [ ] No environment or secret changes
- [ ] Includes environment, secret, or deployment changes; details are below
- [ ] No user-facing UI changes
- [ ] UI changes are included; screenshots or recording are below

<!-- Describe migration, configuration, deployment, or rollback considerations here. -->

## Reviewer Checklist

- [ ] Scope is focused and follows existing project patterns
- [ ] Tests and validation are appropriate for the change
- [ ] No secrets, credentials, or personal data were added
- [ ] Documentation and release notes were updated when needed
