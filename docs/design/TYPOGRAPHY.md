# Typography

> Earthbound / Mother 2 uses a custom 8-bit font. We do too: **Press
> Start 2P** (CC0/OFL), which gives us a proper 8-pixel grid system
> that pairs cleanly with our 24x24 sprites.

## Rules

- **One font:** `Press Start 2P` (or Press Start 2P fallback chain).
  No secondary display fonts. No body-serif-fonts anywhere. Body
  copy is always monospace, always bitmap-friendly.
- **Two sizes:**
  - Caption (8 logical px) — speech bubbles, count badges
  - Body (12 logical px) — chat input, log lines

## Sizing
All text dimensions use **even integers** so pixels stay on the grid.
- Padding: 6px multiples.
- Line height: 18px / 24px.

## Cursor / caret
A 1-pixel blink caret, frequency 530 ms (12×44 fps ≈ Earthbound).
No `caret-color` browbeat, just our own blink.

## Anti-aliased text — only in the marketing site. NEVER in product UI.

## Treatment
- No bold / italic / underlined non-printable / strikethrough.
- Body text: 1 px hairline ink + 1 px paper face underneath, no text-shadow.

## Chat layout
- Body text 12 px Press Start 2P.
- Lines wrap early at 38 chars.
- Spacing between bubbles: 6 px.
- Indent for system messages: 18 px left.

## Mandatory imports
```css
@font-face {
  font-family: 'Press Start 2P';
  src: local('Press Start 2P'),
       url('/fonts/PressStart2P-Regular.woff2') format('woff2');
  font-display: swap;
}
* { font-family: 'Press Start 2P', ui-monospace, monospace; }
```
