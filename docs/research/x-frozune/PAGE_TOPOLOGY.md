# Folio profile topology

1. Shared Folio page shell
   - Centered grid with the left rail, timeline, gap, and discovery rail.
   - The left rail is sticky for the full viewport height.
2. Profile top bar
   - Sticky, 53 px high.
   - Back control, Gavin, the current tab count, profile summary, and search.
3. Profile hero
   - 3:1 banner.
   - Circular avatar overlaps the banner.
   - Edit profile control aligns to the right.
   - Name, handle, bio, link, join date, and follow counts use normal flow.
4. Profile tabs
   - Five equal or content-sized tabs in a 54 px row.
   - The row changes the local feed state on click.
5. Profile feed
   - Reuses the shared post card.
   - Posts and Sample one show placeholder records. Sample two and Sample three use focused empty or grid states. Sample four shows a private note and placeholders.
6. Profile discovery rail
   - Search only.
   - Hidden below 1005 px.

The page has no backend dependency. All state is local to the clone route.
