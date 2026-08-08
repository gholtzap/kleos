# XSidebar specification

## Overview

- Target file: `src/components/XSidebar.tsx`
- Screenshot: `docs/design-references/x-home-desktop-stable.png`
- Interaction model: click and hover

## DOM structure

- `aside` contains logo, primary navigation, post control, and account control.
- Navigation items contain one SVG icon and one sentence-case label.

## Computed styles

- Inner desktop width: `259px`.
- Navigation top: `58px`.
- Navigation direction: column.
- Navigation item height: `58.25px`; vertical padding: `4px`.
- Item text: `20px`; active weight: 700.
- Post control: `233.094px × 52px`; horizontal padding: `32px`; radius: `9999px`.
- Post background: `rgb(239, 243, 244)`; text: `rgb(15, 20, 25)`.
- Account control: `259px × 65.555px`; padding: `12px`; radius: `9999px`.

## States and behaviors

- Active item shows a filled icon and bold text.
- Hover changes the inner item background to `rgba(231, 233, 234, 0.024)`.
- Hover transition: `background-color 0.2s, box-shadow 0.2s`.
- The post control is local. The account control links to the profile page.

## Assets

- Folio wordmark and `ComposeIcon` from `x-icons.tsx`.
- Other icons can use the installed Phosphor package.

## Text content

- Home, Profile, Post, and the signed-in Clerk account name and handle.

## Responsive behavior

- Desktop: show labels and the full post and account controls.
- Tablet and mobile: 68 px rail, icons only, 52 px circular post control, avatar-only account control.
- Label switch: approximately 1160 px.
