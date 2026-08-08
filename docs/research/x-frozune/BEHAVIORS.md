# Folio profile behaviors

## Interaction model

- The page uses native vertical scrolling.
- The 53 px profile top bar stays at the top of the 598 px timeline.
- The profile tabs use click navigation. Each tab replaces the feed below the tab row.
- The left rail stays fixed. It becomes icon-only below 1160 px.
- The discovery rail is hidden below 1005 px.

## Profile tabs

- Posts is selected on load. It shows Gavin's posts and reposts.
- Sample one shows post placeholders. The profile header stays unchanged.
- Sample two shows the subscription placeholder state.
- Sample three changes the top count to "4 photos & videos" and shows placeholders.
- Sample four changes the top count to "8 Likes" and shows the private-likes note and placeholders.
- The selected label is `#e7e9ea` at weight 700. Other labels are `#71767b`.
- The selected tab has a 4 px blue underline with a pill radius.
- A tab hover uses a light neutral overlay. The transition is 0.2 s.

## Profile controls

- Back, profile summary, search, and edit profile controls use button or link hover states.
- Edit profile has a transparent background, a 1 px `#536471` border, a pill radius, and a 0.2 s background transition.

## Post and search controls

- Post actions use the existing local reply, repost, like, bookmark, and share controls.
- Reposted and liked source records can start in an active state.
- Search submits without navigation.

## Responsive sweep

- Desktop, 1440 px: 267 px label rail, 600 px bordered timeline, 30 px gap, 350 px discovery rail.
- Tablet, 768 px: 68 px icon rail and 600 px timeline. The discovery rail is hidden.
- Mobile, 390 px: 68 px icon rail and a 322 px timeline. The banner is 320 by about 107 px. The profile avatar is about 73 px. The five tabs overflow horizontally.
- At all widths, the page remains black and the timeline border stays `#2f3336`.

## Scroll and time checks

- No scroll snap, parallax, timed carousel, or entrance animation is present.
- The profile header and discovery rail use sticky positioning. Content uses normal browser scrolling.
