# Sprites

> 24×24 master silhouette. Same shape, all 7 stages. Only the palette
> indices change. Animation-state table is fixed.

## Master silhouette (24×24)
The pet is a buildable companion:
- Rounded head + 2 ear-fins (top)
- Tear-drop body w/ chest-bell highlight
- 2 legs (bottom row)
- Tail-flicker dot
Eye-dots 2px each. Mouth slot 3px wide, 1px tall (redraws per mood).

## Animation table (per stage)

| name     | frames | duration | easing      |
|----------|--------|----------|-------------|
| idle     | 4      | 0.66 s   | step        |
| blink    | 2      | 0.13 s   | step        |
| click    | 4      | 0.13 s   | step        |
| evolve   | 8      | 0.66 s   | step        |
| walk-l  | 4      | 0.33 s   | step        |
| walk-r  | 4      | 0.33 s   | step        |

`step` = no interpolation. 1 frame per 167 ms (idle) exactly.

## Sprite data layout

```json
{
  "stage": "hatchling",
  "size": 24,
  "palette": ["#...","#...","#...","#...","#...","#...","#..."],
  "frames": {
    "idle":  [ "..", "..", "..", ".." ],
    "blink": [ "..", ".." ],
    "click": [ "..", "..", "..", ".." ],
    "evolve":[ "..", "..", "..", "..", "..", "..", "..", ".."],
    "walk_l":[ "..", "..", "..", ".." ],
    "walk_r":[ "..", "..", "..", ".." ]
  }
}
```

Each frame is a base32-encoded row-major index grid of length 24×24.

Use `apps/desktop/static/img/sprites/build_sprites.ts` (placeholder
for the generator pipeline) to render the data into PNG sprite sheets.

## Evolution burst has its own overlay

The "evolve" animation is rendered on a separate offscreen buffer
whose origin matches the pet. The pet is invisible after frame 4;
frames 5-8 reveal the next-stage silhouette in the same position,
overlay dithered aurora particles. The aurora is a 1-pixel spark
sprite randomly distributed around the pet.

## Hairlines / outlines

Pet silhouette outlines are always 1 pixel wide and use `palette[1]`
(outline ink). Even at 8× zoom on a 192-px floating window, the
hairlines remain 1 css pixel because we set `image-rendering:
pixelated` and the canvas drawing uses `floor()` on every coord.

## Save format

Files are JSON for readability. A build script (`pnpm i && pnpm
build:assets`) translates them into a single Rust module that ships
inside `monster-pixel` for production.
