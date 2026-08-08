# XProfileHero specification

## Overview
- Target: `src/components/XProfileHero.tsx` and `x-profile-hero.css`.
- Screenshots: `x-frozune-desktop-viewport.png`, `x-frozune-tablet-viewport.png`, and `x-frozune-mobile-viewport.png`.
- Interaction model: static profile content with one edit callback.

## Structure and exact values
- Banner uses `/x-assets/gavin-banner.jpg`, width 100%, aspect ratio 3 / 1, object-fit cover.
- Desktop profile body has 16 px horizontal padding.
- Desktop avatar is 145.5 px including a 6 px black ring. The image is 133.5 px. It overlaps the banner by about 69 px.
- Mobile avatar is about 80 px including the ring and overlaps the banner by about 40 px.
- Edit profile is 36 px high, 1 px `#536471` border, pill radius, 16 px horizontal padding, weight 700.
- Profile name is 20 px, weight 800, line height 24 px.
- Handle is 15 px, `#71767b`, line height 20 px.
- Bio is 15 px, line height 20 px, with preserved line break.
- Detail row and labels use `#71767b`. Links use `#1d9bf0`.
- Follow counts use 14 px. Numbers are weight 700 and labels are muted.

## Text
- Name and handle come from the signed-in Clerk account.
- Sample profile biography.
- Add more details about this user here.
- example.com
- Joined January 2024
- 12 Following
- 34 Followers

## Assets
- `/x-assets/gavin-profile.jpg`
- `/x-assets/gavin-banner.jpg`

## Responsive behavior
- Desktop and tablet banner height is about 199 px for the 598 px inner timeline.
- Mobile banner is about 107 px for the 320 px inner timeline.
- Mobile uses 16 px profile padding and keeps Edit profile to the right of the avatar.
