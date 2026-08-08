# XProfileTopBar specification

## Overview
- Target: `src/components/XProfileTopBar.tsx` and `x-profile-top-bar.css`.
- Screenshot: `docs/design-references/x-frozune-desktop-viewport.png`.
- Interaction model: static layout with local button callbacks.

## Structure and styles
- Header is sticky at `top: 0`, z-index 10, width 100%, height 53 px.
- Background is `rgb(0 0 0 / 90%)` with 12 px backdrop blur.
- Back control is 56 px wide. Use an arrow-left icon at 20 px.
- Copy area grows. The account name uses 20 px, weight 700, 24 px line height. Count uses 13 px, `#71767b`, 16 px line height.
- Two 36 px icon controls align to the right with 8 px edge spacing.
- Hover is a 0.2 s neutral circular overlay. Focus uses the shared blue outline.

## Text
- Name: signed-in Clerk account name.
- Default count: 12 posts.
- Media count: 4 photos & videos.
- Likes count: 8 Likes.

## Responsive behavior
- The header keeps the same height and full timeline width at 1440, 768, and 390 px.
