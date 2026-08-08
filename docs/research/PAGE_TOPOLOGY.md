# Folio home page topology

## Wide layout

1. Primary rail
   - Fixed visual rail on the left.
   - Folio wordmark, navigation, post control, and account control.
   - Click and hover interaction.
2. Home timeline
   - 600 px center column with one-pixel side borders.
   - Composer followed by a vertical post feed.
   - Click, hover, and scroll interaction.
3. Discovery rail
   - 350 px right column after a 30 px gap.
   - Search only.
   - Focus interaction.

## Layer order

- Page background: `#000000`.
- Timeline and cards: same black surface with `#2f3336` borders.
- Floating utility controls from the live site are not part of the clone page.

## Narrow layout

- The primary rail becomes 68 px wide.
- The discovery rail is not rendered when it cannot fit.
- The timeline width is `calc(100vw - 68px)` below 700 px.
- No section changes from scroll-driven to click-driven behavior.
