# Folio home behavior record

## Interaction model

- The page uses native vertical scrolling.
- The primary rail remains at the top of the viewport.
- The discovery rail stays beside the timeline on wide screens.
- The page has no Lenis or Locomotive Scroll classes.

## Scroll behavior

- Posts do not animate into view. The timeline uses normal document flow.

## Click behavior

- Search focus changes its shell to `border: 2px solid rgb(29, 155, 240)`.
- Post action controls toggle a local state in the clone. They do not send data.
- Navigation controls select a local item in the clone. They do not leave the page.

## Hover behavior

- A primary navigation item changes its inner background from transparent to `rgba(231, 233, 234, 0.024)`.
- A post changes its background from transparent to `rgba(255, 255, 255, 0.008)`.
- Both changes use `background-color 0.2s, box-shadow 0.2s`.

## Responsive behavior

- At 1440 px, the page has a labeled primary rail, a 600 px timeline, a 30 px gap, and a 350 px discovery rail.
- Near 1150 px, the primary rail keeps icons and removes its text labels.
- At 768 px, the discovery rail is outside the visible layout and the primary rail is icon-only.
- At 390 px, the primary rail is 68 px wide and the timeline uses the remaining 322 px.
- The composer stays visible at all three tested widths. Low-priority composer controls are removed on small screens.

## Time-driven behavior

- The live site can replace timeline content when new posts arrive.
- The clone uses fixed demo data so that visual checks are repeatable.
