# XPostCard profile extension specification

## Overview
- Target: the existing `src/components/XPostCard.tsx` and `x-post-card.css`.
- Screenshot: `docs/design-references/x-frozune-desktop-viewport.png`.
- Interaction model: existing local post actions.

## Required primitive additions
- Add optional context text above the post, such as "You reposted".
- Add optional reply target text below the identity row, such as "Replying to @geoffreylitt".
- Add optional initial repost, like, and bookmark state.
- Preserve all existing home feed behavior and records.

## Exact styles
- Context uses 13 px, weight 700, line height 16 px, and `#71767b`.
- Context is indented to the post content start.
- Reply label uses 15 px and `#71767b`; the target uses `#1d9bf0`.
- The first profile post remains 598 px wide with 16 px horizontal padding.
