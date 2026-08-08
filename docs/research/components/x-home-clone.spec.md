# XHomeClone specification

## Overview

- Target file: `src/components/XHomeClone.tsx`
- Screenshot: `docs/design-references/x-home-desktop-stable.png`
- Interaction model: scroll, click, input, and hover

## DOM structure

- Page grid contains `XSidebar`, center timeline, and `XDiscoveryRail`.
- Timeline contains `XComposer` and placeholder post items.

## Computed styles

- Page background: `rgb(0, 0, 0)`.
- Main text: `rgb(231, 233, 234)`.
- Desktop grid: `267.5px 600px 350px` with `30px` before the third column.
- Max page width: approximately `1248px`; centered at 1440 px.
- Timeline: `600px`; side borders: `1px solid rgb(47, 51, 54)`.

## States and behaviors

- Composer adds a local placeholder post to the feed.
- Native page scrolling only.

## Assets

- Manrope is the shared interface font. A Folio SVG provides the favicon.

## Text content

- Feed records use placeholders.

## Responsive behavior

- 1440 px: all three columns.
- 768 px: icon rail and 600 px timeline.
- 390 px: 68 px rail and 322 px timeline.
