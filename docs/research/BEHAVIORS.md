# Social hover cards behavior

- Pointer hover and keyboard focus open an item's preview.
- Leaving the row and preview starts a 120 ms close delay.
- Moving between items keeps one card mounted and animates its horizontal position, width, height, and content.
- New content enters from the direction of travel with opacity, horizontal travel, and an 8 px blur.
- The card uses a spring with stiffness 420 and damping 38.
- On touch, the first tap opens a linked preview and the second tap follows the link.
- Reduced-motion preferences keep the state change but remove directional travel and blur.
- Interactive content remains usable because the preview is inside the component's pointer and focus boundary.
