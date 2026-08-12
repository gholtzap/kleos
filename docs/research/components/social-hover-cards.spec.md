# SocialHoverCards specification

## Overview

- Target: `src/components/SocialHoverCards.tsx` and `src/components/social-hover-cards.css`.
- Desktop reference: `docs/design-references/social-hover-cards-desktop.png`.
- Mobile reference: `docs/design-references/social-hover-cards-mobile.png`.
- Interaction model: hover, focus, and touch.
- Source: `https://ui.unlumen.com/components/social-hover-cards`.

## Existing primitives

- Use the installed `motion/react` package for the shared spring and content transitions.
- Accept `ReactNode` icons so callers can use the installed Phosphor icons.
- Keep account data and card content outside the component.
- Use no new dependency and no app-wide style or data change.

## Public types

`SocialHoverCardItem` has `value`, `label`, `icon`, optional `href`, `content`, `target`, and `rel`.

`SocialHoverCardsProps` has `items`, optional controlled `value`, `defaultValue`, `onValueChange`, `cardOffset`, `iconSize`, `showLabels`, `closeDelay`, `contentBlur`, `springStiffness`, `springDamping`, `cardClassName`, `linkClassName`, and `className`.

Defaults: `defaultValue=""`, `cardOffset=8`, `iconSize=24`, `showLabels=false`, `closeDelay=120`, `contentBlur=8`, `springStiffness=420`, and `springDamping=38`.

## DOM structure

- Root: relative inline flex row.
- Each item: link when `href` exists, otherwise button.
- Shared preview: one absolute card above the row with `role="group"` and an item-specific accessible label.
- Active content: one measured content node inside the shared card.

## Computed styles

### Root

- `display: inline-flex`; `position: relative`; `align-items: center`.
- Four default icon-only items make a 160 by 40 px row.

### Trigger

- `display: flex`; `align-items: center`; `gap: 8px`; `padding: 8px`.
- `height: 40px`; icon width and height: 24px; `border-radius: 10px`.
- Default color: `#a0a0a0`; active, hover, and focus color: `#e5e5e5`.
- Color transition: 150 ms cubic-bezier(0.4, 0, 0.2, 1).
- Visible focus ring is required.

### Shared card

- Default content width: caller controlled; the reference content is 288px.
- Position the card 8px above the row and center it on the active trigger.
- `overflow: hidden`; `background: #171717`; `color: #e5e5e5`.
- `border: 1px solid rgb(255 255 255 / 4%)`; `border-radius: 14px`.
- Animate horizontal position, width, and height with the configured spring.

## States and behavior

- Closed: no preview card is present.
- Open: active trigger has `aria-expanded="true"` and controls the preview.
- Item change: outgoing content moves and blurs opposite the incoming content.
- Pointer leave: close after the configured delay unless the pointer enters the card or another trigger.
- Focus: opening follows `focus`; closing follows focus leaving the root.
- Touch link: first tap prevents navigation and opens; second tap uses the anchor normally.
- Button items activate the preview and never navigate.
- Controlled mode calls `onValueChange` but does not own the value.
- Reduced motion removes directional travel and blur.

## Responsive behavior

- Desktop 1440px: the row remains 160 by 40 px and the 288px card centers over the active trigger.
- Tablet 768px: behavior and dimensions stay the same.
- Mobile 390px: the row remains 160 by 40 px; the card stays 288px wide and is clamped within 16px of the viewport.

## Assets and content

- No component-owned asset.
- No component-owned social icon, account, destination, or preview copy.

## Verification

- Test uncontrolled focus open and close.
- Test controlled changes.
- Test touch first-tap behavior for links.
- Run TypeScript, focused tests, and the app build when disk space permits.
