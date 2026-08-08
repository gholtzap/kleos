# XProfileTabs specification

## Overview
- Target: `src/components/XProfileTabs.tsx` and `x-profile-tabs.css`.
- Screenshot: `docs/design-references/x-frozune-mobile-viewport.png`.
- Interaction model: click-driven tab selection.

## Structure and exact styles
- Navigation is 54 px high with a 1 px bottom border `#2f3336`.
- The tab list is a horizontal flex row.
- Each tab is 53 px high with 16 px horizontal padding and a 0.2 s background transition.
- Selected text is `#e7e9ea`, weight 700. Other text is `#71767b`, weight 500.
- Selected underline is 4 px high, `#1d9bf0`, and uses a pill radius.
- Mobile keeps all five tabs in one horizontal row and allows horizontal overflow without a visible bar.

## States
- Visible labels are Posts, Sample one, Sample two, Sample three, and Sample four.
- Internal typed tab keys keep the existing panel behavior.
- Each tab sets `aria-selected`, updates the panel, and changes the count in the top bar through the page wrapper.
