# XDiscoveryRail specification

## Overview

- Target file: `src/components/XDiscoveryRail.tsx`
- Screenshot: `docs/design-references/x-home-desktop-stable.png`
- Interaction model: focus, click, and hover

## DOM structure

- Rail contains only the search form.

## Computed styles

- Width: `350px`; top padding: `9px`; bottom padding: `64px`.
- Search: `350px × 44px`; pill radius; black background.
- Focus border: `2px solid rgb(29, 155, 240)`.

## States and behaviors

- Search shows its blue border on focus.

## Assets

- Search uses the installed Phosphor package.

## Responsive behavior

- Desktop: show at 350 px after a 30 px gap.
- Compact desktop: allow 290 px.
- Tablet and mobile: do not render the rail.
