# HUD

> Earthbound/ActRaiser panels = 1-pixel hairline border + 1-pixel bevel of the
> inner palette accent. That's it. No glass, no glow.

## Border widths
- 1 px hairline (default)
- 2 px bevel (for highlighted currently-active state)
- 3 px bezel (only for major modal corners)

## Bevels
- Outer hairline: palette[1] ink
- Inner shadow at bottom-right: palette[2] (darker)
- Inner highlight at top-left: palette[5] (lighter)
- This gives 1 logical pixel of depth.

## Panels
| UI element            | panel face | hairline ink | bevel top-left | bevel bot-right |
|-----------------------|------------|--------------|----------------|-----------------|
| Floating pet window    | transparent| —            | —              | —               |
| Speech bubble (idle)  | palette[3] | palette[1]   | palette[5]     | palette[2]      |
| Chat panel             | paper      | ink          | palette[5]     | palette[2]      |
| Chat message (you)     | palette[3] | ink          | palette[4]     | palette[2]      |
| Chat message (pet)     | ink-ext 6% | ink          | ink-ext 12%    | ink             |
| Modal (Evolution)      | palette[3] | ink          | palette[5]     | palette[2]      |
| Toast                 | paper      | ink          | palette[5]     | palette[2]      |

## Background tiles
A 16×16 dithered tile is repeated. Tile is 50% paper + 50% palette[5] in
a check pattern. Visible only at low zoom. Scroll rate: 1 pixel every
4 frames when the pet is in `walk` animation only.

## Spacing scale
- 1, 2, 3, 6, 12, 18, 24 logical pixels. (Multiples of 6.)
- No 4, 5, 7, 8, 11, 13. If the design needs irregular gaps, redesign.

## No-go
- ❌ radii
- ❌ shadows
- ❌ gloss / glass
- ❌ inset gradients
- ❌ anything that looks like a `box-shadow: 0 0 20 rgba(0,0,0,0.4)`
