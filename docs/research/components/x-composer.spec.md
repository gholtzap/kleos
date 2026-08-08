# XComposer specification

## Overview

- Target file: `src/components/XComposer.tsx`
- Screenshot: `docs/design-references/x-home-desktop-stable.png`
- Interaction model: input and click

## DOM structure

- Composer contains an avatar placeholder, text input, and post button.

## Computed styles

- Desktop content width: `598px`; bottom border: `1px solid rgb(47, 51, 54)`.
- Input: `513.5px × 28px`; `20px / 24px`; weight 400.
- Toolbar: `518px × 48px`; Post aligns to the right.
- Post control: `66.734px × 36px`; horizontal padding: `16px`; radius: `9999px`.
- Disabled opacity: `0.5`; enabled background: `rgb(239, 243, 244)`.
- Avatar: `40px × 40px`; circle.

## States and behaviors

- Text input enables the post control when trimmed text is not empty.
- Clicking Post sends the text to the page callback and clears the input.
- The clone does not send data to an external service.

## Text content

- Placeholder: `What’s happening?`
- Control: `Post`

## Responsive behavior

- All widths show the text input and Post control.
