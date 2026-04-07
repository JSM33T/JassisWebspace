# UI Findings

## Scope

Review focused on navigation, primary content pages, shared page chrome, and authentication UX. No code changes are proposed here beyond recommendations.

## Findings

1. Nested interactive music cards
   Status: Done
   File: [app/music/page.tsx](/mnt/c/Dev/jassi.me/ui/app/music/page.tsx#L190)
   Issue: Each track card acts like a button while also containing `Play` and `Open` controls. That creates accidental navigations, awkward keyboard behavior, and conflicting click targets.
   Fix: Make the card itself non-interactive and keep navigation on an explicit `Open` link/button, or make the whole card a link and move playback outside that hit area.

2. Blog filters update too aggressively
   Status: Done
   File: [app/blog/page.tsx](/mnt/c/Dev/jassi.me/ui/app/blog/page.tsx#L72)
   Issue: URL p     arams and results update on every search/filter change with no debounce. This can feel jumpy and slow on weaker devices or slower APIs.
   Fix: Debounce search by 250-400ms, batch filter updates, or use an explicit `Apply filters` action on mobile.

3. Inconsistent navigation terminology
   Status: Done
   Files: [components/navbar.tsx](/mnt/c/Dev/jassi.me/ui/components/navbar.tsx#L105), [components/navbar.tsx](/mnt/c/Dev/jassi.me/ui/components/navbar.tsx#L355), [components/navbar.tsx](/mnt/c/Dev/jassi.me/ui/components/navbar.tsx#L381), [app/page.tsx](/mnt/c/Dev/jassi.me/ui/app/page.tsx#L32)
   Issue: Labels vary across surfaces, including `Blogs` vs `Blog`, `Official` vs `Work`, and `Info` vs `About`.
   Fix: Standardize one vocabulary set across desktop rail, mobile menu, homepage, and page intros.

4. Home hero relies too much on icon-only navigation
   Status: Done
   File: [app/page.tsx](/mnt/c/Dev/jassi.me/ui/app/page.tsx#L111)
   Issue: The icon ring around the logo looks polished but weakens first-time discoverability and forces users to infer destination meaning.
   Fix: Add visible labels, or replace the icon ring with 1-2 strong CTAs plus a labeled secondary nav row.

5. Shared page intro overuses the back button pattern
   Status: Done
   File: [components/page-intro-card.tsx](/mnt/c/Dev/jassi.me/ui/components/page-intro-card.tsx#L64)
   Issue: The intro card always renders a `Back` button, defaulting to `/`, even when that action is not contextually useful.
   Fix: Make the back control optional by default, or replace it with contextual actions or breadcrumbs.

6. Blog page stacks too much sticky chrome before content
   Status: Done
   Files: [app/blog/page.tsx](/mnt/c/Dev/jassi.me/ui/app/blog/page.tsx#L165), [app/blog/page.tsx](/mnt/c/Dev/jassi.me/ui/app/blog/page.tsx#L173)
   Issue: A sticky intro card plus a separate filter panel creates a lot of non-content UI before users reach articles, especially on mobile.
   Fix: Merge intro and filters into a single compact header area, or make only one of them sticky.

7. Utility controls still compete with primary nav
   Status: Done
   Files: [components/navbar.tsx](/mnt/c/Dev/jassi.me/ui/components/navbar.tsx#L565), [components/navbar.tsx](/mnt/c/Dev/jassi.me/ui/components/navbar.tsx#L723)
   Issue: Utility actions such as `More` and `Player and theme` use the same visual treatment as destination links, so hierarchy is blurred.
   Fix: Separate utility controls with a stronger divider, smaller treatment, or a distinct bottom tray style.

8. `Forgot password?` is removed from keyboard flow
   Status: Done
   File: [app/login/page.tsx](/mnt/c/Dev/jassi.me/ui/app/login/page.tsx#L180)
   Issue: `tabIndex={-1}` keeps a standard recovery action out of the normal tab order.
   Fix: Remove that override so keyboard users can reach it normally.

9. Homepage ties multiple content feeds to one failure mode
   Status: Done
   File: [app/page.tsx](/mnt/c/Dev/jassi.me/ui/app/page.tsx#L61)
   Issue: Gallery and blog content load together and share the same error outcome, so one failed feed can make the page feel broadly broken.
   Fix: Split loading and error states per section so each module degrades independently.

10. Gallery and music browsing lacks lightweight refinement controls
    Status: Done
    Files: [app/gallery/page.tsx](/mnt/c/Dev/jassi.me/ui/app/gallery/page.tsx#L109), [app/music/page.tsx](/mnt/c/Dev/jassi.me/ui/app/music/page.tsx#L151)
    Issue: Browsing depends heavily on visual scanning, with limited sort/filter affordances.
    Fix: Add simple refinement tools such as `Newest`, `Popular`, `Category`, or `Playable only`.

## Suggested Priority

1. Fix nested interactive music cards.
2. Debounce or batch blog filtering.
3. Normalize nav labels across all surfaces.
4. Restore keyboard access to `Forgot password?`.
5. Make homepage navigation more explicit.
