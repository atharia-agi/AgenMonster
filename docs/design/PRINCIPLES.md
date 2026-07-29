# Design Principles — Anti-Slop Manifesto

> *AgenMonster's pet is what Earthbound/SNES-era Japanese games would have
> been if they shipped on a modern stack.*

## What we ban

- **`border-radius`** — borders are always 90°. Rounded corners are a
  *lie of the OS GUI toolkit* and we don't author lies.
- **`backdrop-filter: blur`** and any `filter: blur` — there is no
  glass; everything is opaque pixels stacked.
- **`box-shadow`** on panels — depth comes from a 1-px darker line on
  the bottom-right edge, not from Gaussian haze.
- **Animations longer than 250 ms** on UI affordances — UI is snappy;
  pet idle/walk loops are 4 frames at 6-12 fps.
- **Spring physics** — we use `step-start` and `linear` and short
  cubic-bezier(0,0,1,1) for x→y interpolation.
- **White-on-white text** — we *literally do not write* anti-aliased
  color-on-color text. Body copy uses `1px hairline` ink on paper.
- **CSS variables for "color-of-the-day" theming** — palettes are
  data, not functions. Each stage has a fixed palette and never
  transitions mid-loop.
- **`linear-gradient` for ambient background** — backgrounds are
  solid colors with optional dithered tile patterns (≤6 alpha).

## What we DO

- **Earthbound/SNES-scale color discipline.** Each palette is a
  fixed table of 7-9 colors. We hire real artists to choose them.
- **1px hairlines and 2-px bevels.** Borders are LITERAL pixel widths.
- `image-rendering: pixelated;` everywhere pixel art shows up.
- **8-frame idle, 4-frame walk, 2-frame blink, 1-frame word-bubble
  pop, 8-frame evolution burst.** That is all.
- **No emojis in the UI.** Pet has a real, custom-designed palette
  sprite. Speech uses a custom bitmap font.
- **Cursor-near feedback.** Pet eyes follow a deterministic near-
  cursor easing. Click = 4-frame particle burst with 8-bit star
  sprites (no glassy bubbles).
- **A11y: never below body-12px or contrast 4.5:1.** Body text is
  always Paper-on-Ink.

## Honest tools used
- Real Rust crate (`monster-pixel`) for pixel art primitives.
- Real sprite data (24x24 grid index-encoded) in `apps/desktop/static/img/sprites/seed.json`.
- Press Start 2P 8-bit font (OFL) for any rendered text.
