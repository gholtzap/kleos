# XPostCard specification

## Overview

- Target file: `src/components/XPostCard.tsx`
- Screenshot: `docs/design-references/x-home-desktop-stable.png`
- Interaction model: hover and click

## DOM structure

- Article contains avatar, name line, text, optional media, optional quote, and action row.

## Computed styles

- Desktop width: `598px`; horizontal padding: `16px`.
- Avatar: `40px × 40px`.
- Post text: `15px / 20px`; weight 400; color `rgb(231, 233, 234)`.
- Main content width after avatar: `518px`.
- Media width: `516px`; radius: `16px`; border: `1px solid rgb(47, 51, 54)`.
- Action row: `518px × 20px`; top margin: `12px`; `justify-content: space-between`; gap: `4px`.
- Muted text and icons: `rgb(113, 118, 123)`.

## States and behaviors

- Hover background: `rgba(255, 255, 255, 0.008)`.
- Hover transition: `background-color 0.2s, box-shadow 0.2s`.
- Reply, repost, like, and bookmark controls update local demo state.
- Like uses pink; repost uses green; reply uses blue in active or hover states.

## Assets

- Avatars and media from `public/x-assets/`.
- Exact action paths from `x-icons.tsx`.

## Text content

- Use the typed `XPost` data supplied by the page wrapper.

## Responsive behavior

- Desktop and tablet: fixed timeline width.
- Mobile: article width follows the 322 px timeline; content and media use the available width.
