# Palette

> Each stage has a fixed 7-color palette. The pet silhouette stays
> the same; only the palette swaps. This is the Earthbound/Mother
> regions principle: change the color story, not the model.

| Stage       | Family  | Hex values                                                                                  |
|-------------|---------|----------------------------------------------------------------------------------------------|
| **Egg**     | Cream   | `#fff5e6` `#ffe2a8` `#ffd270` `#c98724` `#6b3a17` `#1d1306` `#fdfdf3`                       |
| **Hatchling** | Fern  | `#d4f4a6` `#88c457` `#4f8b2c` `#2a5e1e` `#1a3011` `#0a1b08` `#fdfdf3`                       |
| **Baby**    | Sea     | `#e2f4ff` `#86ccf2` `#4f9bd0` `#2c6498` `#214266` `#0c1f3f` `#fdfdf3`                       |
| **Child**   | Iris    | `#f0dffa` `#c896e4` `#965ccd` `#5f2fb1` `#3a1f75` `#1a0c40` `#fdfdf3`                       |
| **Teen**    | Rose    | `#ffd9df` `#ff7e95` `#f73e63` `#c4193b` `#8c0d2e` `#510521` `#fdfdf3`                       |
| **Adult**   | Sun     | `#f7e3a3` `#f5c057` `#d49327` `#a56614` `#6e3f0e` `#3b200a` `#fdfdf3`                       |
| **Mega**    | Aurora  | `#ffe07d` `#9affc0` `#75b3ff` `#ffc5ff` `#f0a8ff` `#2d1736` `#fdfdf3`                       |

Palette index meanings:

| idx | role           |
|-----|----------------|
| 0   | paper (unused) |
| 1   | outline ink    |
| 2   | dark base      |
| 3   | mid base       |
| 4   | light base     |
| 5   | highlight      |
| 6   | cream (eyes / belly) |

## Mood punctuation
A palette *never* mixes more than 2 hues. Cross-hue contrast is
achieved by saturation, not warmth. Mega stage is the ONLY one with
multi-hue accents; it is reserved for 8-frame evolution bursts only.

## Where palettes are USED
- Pet sprite sheet per stage — 7 indices max.
- Speech bubble — palette colors only:
  - panel face     = palette[3] (mid base)
  - panel ink      = palette[1] (outline ink)
  - body text ink  = palette[1]
  - body text face = palette[6] (cream)
- HUD panels / chat stream / marketplace admin — paper face + ink.

## Dark mode is THE default (Sprite art often lost on light bg.)
`--paper: #fdfdf3` `--ink: #0c0c0c` are the only colors used outside
a stage palette; they are constants.

If you need a "(stage b)" mode in future (e.g. Adult-stage-mirror),
ADD a new palette entry into a per-stage JSON, do not invent colors at
runtime.
