# XFrozuneProfileClone specification

## Overview
- Target: `src/components/XFrozuneProfileClone.tsx` and `x-frozune-profile-clone.css`.
- Screenshot: `docs/design-references/x-frozune-desktop-viewport.png`.
- Interaction model: click-driven page state, persisted profile edits, and native scrolling.

## Assembly
- Reuse XSidebar with Profile active.
- Use XProfileTopBar, XProfileHero, XProfileTabs, and the search-only XDiscoveryRail.
- Grid matches the existing Folio home shell: 267 px, 600 px, 30 px, and 350 px at 1440.
- Timeline has 1 px side borders and a 600 px outside width.
- Profile state starts on Posts.
- Sample two shows the subscription placeholder state.
- Sample three shows a compact placeholder grid.
- Sample four shows the private-likes note and placeholder records.
- Edit profile opens a modal for the bio and website and saves changes per signed-in handle.
- Sidebar Post scrolls the profile feed to the top.

## Responsive behavior
- Use the existing Folio home grid breakpoints.
- Hide discovery below 1005 px.
- Use 68 px icon rail below 1160 px.
- Use 68 px plus the remaining width below 700 px.
