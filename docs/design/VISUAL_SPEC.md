# AgenMonster — Visual Design Specification v1.0

> **Untuk desainer agent / mockup designer.**
> Dokumen ini adalah acuan tunggal untuk semua visual decision di project AgenMonster.
> Follow spec ini secara ketat — aesthetic integrity is non-negotiable.

---

## 1. Project Overview

**AgenMonster** adalah desktop AI companion — monster pixel-art yang hidup di desktop user, bisa browse web, control apps, deep research, dan evolve skills over time. Core concept: monster "eats" API tokens → XP → evolution.

**Platform:** Tauri 2 desktop (Windows/Mac/Linux), Svelte 5 frontend
**Target:** Power users, developers, AI enthusiasts
**Vibe:** Earthbound/SNES 90s Japanese RPG — anti-glassmorphism, anti-slop

---

## 2. Design Philosophy — Anti-Slop Manifesto

### BANNED (Hard Rule — Jangan Pernah Gunakan)
| Sifat | Alasan |
|---|---|
| `border-radius` | Borders are ALWAYS 90deg. Rounded corners = lie of OS GUI toolkit |
| `backdrop-filter: blur` / `filter: blur` | No glass. Everything is opaque pixels stacked |
| `box-shadow` on panels | Depth = 1px darker line on bottom-right edge, not Gaussian haze |
| `linear-gradient` for backgrounds | Backgrounds = solid colors + optional dithered tile patterns |
| Spring physics / long animations | UI snappy: `step-start`, `linear`, short cubic-bezier |
| White-on-white text | Body copy = 1px hairline ink on paper |
| Emojis in UI | Pet has real custom palette sprite. Speech = bitmap font |
| CSS variables for "color-of-the-day" | Palettes are data. Fixed per stage, never transition mid-loop |
| Glassmorphism / Frosted glass | Anti-glass is core identity |
| Rounded buttons / cards / inputs | Everything rectangular. 1px borders |
| Transparency / opacity on panels | Opaque backgrounds always |

### REQUIRED (Hard Rule — Wajib)
| Sifat | Detail |
|---|---|
| `image-rendering: pixelated` | Everywhere pixel art shows up |
| `image-rendering: crisp-edges` | Canvas elements |
| 1px hairlines | Borders = literal pixel widths |
| 2px bevels | For emphasis borders only |
| Step animations | No smooth transitions. 1 frame per step |
| Earthbound/SNES color discipline | Fixed 7-9 color palettes per stage |
| Real bitmap fonts | 1UP for titles, Players for body, Press Start 2P fallback |
| Paper-on-ink contrast | Body text always ≥4.5:1 contrast ratio |
| 12px minimum body text | Never below 12px for readability |

---

## 3. Color Palettes — 7 Evolution Stages

Setiap stage punya EXACT palette. **Jangan variasikan warna di luar palette ini.**

### Stage: Egg 🥚
```
Background:  #0d0d1a (deep navy-black)
Primary:     #f5f0e6 (cream white)
Secondary:   #dcd2c3 (warm beige)
Accent:      #c8bfa8 (tan)
Border:      #988878 (warm gray)
Highlight:   #e8e0d0 (light cream)
```
**Mood:** Mysterious, dormant, potential

### Stage: Hatchling 🌱
```
Background:  #0d1a0d (deep forest)
Primary:     #90c878 (leaf green)
Secondary:   #70a858 (grass green)
Accent:      #508838 (dark green)
Border:      #307018 (forest border)
Highlight:   #b0e898 (bright green)
```
**Mood:** New life, curious, fragile

### Stage: Baby 🐣
```
Background:  #0d1a2e (deep ocean)
Primary:     #88ccf0 (sky blue)
Secondary:   #60a8d8 (ocean blue)
Accent:      #4888c0 (steel blue)
Border:      #185890 (deep blue)
Highlight:   #a0e0ff (ice blue)
```
**Mood:** Playful, innocent, energetic

### Stage: Child 🧒
```
Background:  #1a0d2e (deep purple)
Primary:     #d8c8f0 (lavender)
Secondary:   #b8a8d8 (medium purple)
Accent:      #9888c0 (dusty purple)
Border:      #685890 (dark purple)
Highlight:   #e8d8ff (light lavender)
```
**Mood:** Learning, growing, magical

### Stage: Teen ⚡
```
Background:  #2e0d1a (deep crimson)
Primary:     #ff8090 (hot pink)
Secondary:   #e06070 (rose)
Accent:      #c04050 (dark rose)
Border:      #901020 (blood red)
Highlight:   #ffa0b0 (light pink)
```
**Mood:** Rebellious, powerful, fierce

### Stage: Adult 👑
```
Background:  #0d0d2e (deep indigo)
Primary:     #8070c0 (royal purple)
Secondary:   #6050a0 (deep purple)
Accent:      #403080 (midnight purple)
Border:      #100050 (void purple)
Highlight:   #a090e0 (light purple)
```
**Mood:** Wise, commanding, majestic

### Stage: Mega ✨
```
Background:  #1a1a0d (deep gold)
Primary:     #ffc860 (bright gold)
Secondary:   #ffb840 (amber)
Accent:      #ffa820 (orange gold)
Border:      #ff7800 (fire orange)
Highlight:   #ffe090 (light gold)
```
**Mood:** Transcendent, cosmic, ultimate

---

## 4. Typography System

### Font Stack
```css
/* Title font — pixel bitmap, untuk headings & stage labels */
font-family: '1UP', 'Press Start 2P', monospace;

/* Body font — clean pixel, untuk semua body text */
font-family: 'Players', 'Press Start 2P', monospace;

/* Fallback — Google Fonts bitmap */
font-family: 'Press Start 2P', monospace;
```

### Font Sizes
| Element | Size | Font | Weight |
|---|---|---|---|
| Stage label (canvas) | 8px | Press Start 2P | normal |
| Speech bubble text | 9px | Press Start 2P | normal |
| Button text | 11px | Players | normal |
| Body text | 12px | Players | normal |
| Heading (h1) | 16px | 1UP | normal |
| Heading (h2) | 14px | 1UP | normal |
| Debug info | 10px | Press Start 2P | normal |

### Typography Rules
- **No anti-aliased color-on-color text** — always 1px hairline ink on paper
- **Letter-spacing: 0** for pixel fonts
- **Line-height: 1.6** for speech bubbles
- **Text-align: center** for stage labels and speech

---

## 5. Window Specifications

### Pet Window (Floating)
```
Size:           260 × 300 px
Resizable:      false
Decorations:    false (frameless)
Transparent:    true
Always on top:  true
Skip taskbar:   true
Position:       x=100, y=100 (default)
```

**Layout:**
```
┌──────────────────────────────┐
│  ┌────────────────────────┐  │  ← 1px border (stage color)
│  │                        │  │
│  │    [Speech Bubble]     │  │  ← Optional, 9px text
│  │                        │  │
│  │    ┌──────────────┐    │  │
│  │    │              │    │  │
│  │    │   MONSTER    │    │  │  ← 240×240 canvas
│  │    │   SPRITE     │    │  │     (24x24 pixel grid, 10x scale)
│  │    │              │    │  │
│  │    └──────────────┘    │  │
│  │                        │  │
│  │  [STAGE LABEL]         │  │  ← 8px, centered, 30% opacity
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**Canvas Rendering:**
- Background: stage `--active-bg` color
- Grid: subtle 12px grid lines (2% white opacity)
- Shadow: ellipse below sprite (20% black opacity)
- Sprite: 24×24 pixel grid rendered at 10x scale (240×240)
- Blink overlay: 2px dark rectangles over eyes
- Speech: 9px bitmap font, centered, with 1px border box

### Chat Window
```
Size:           400 × 500 px
Resizable:      true
Visible:        false (toggled via shortcut)
```

**Layout:**
```
┌──────────────────────────────────────┐
│  header: "AgenMonster" (14px 1UP)    │  ← 2px bottom border
├──────────────────────────────────────┤
│                                      │
│  [chat messages area]                │  ← Scrollable
│                                      │
│  ┌──────────────────────────────┐    │
│  │ msg-you: "hello pet"         │    │  ← Green (#90c878)
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ msg-pet: "Hi there!"         │    │  ← Blue (#88ccf0)
│  └──────────────────────────────┘    │
│                                      │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐    │
│  │ textarea (input)             │    │  ← 1px border
│  └──────────────────────────────┘    │
│  [SEND] button                       │  ← 1px border, hover=#444
└──────────────────────────────────────┘
```

---

## 6. Sprite System — Master Silhouette

### The 24×24 Grid
All 7 stages share ONE silhouette. **Hanya palette yang berubah.**

```
Pixel Index Mapping:
0 = transparent (empty)
1 = outline (palette[0])
2 = body (palette[1])
3 = eye white (#ffffff)
4 = eye pupil (#1a1a2e)
5 = mouth (#1a1a2e)
6 = belly (palette[2])
```

### Monster Anatomy (from grid)
```
Rows 0-1:   Empty (top padding)
Rows 2-8:   HEAD — round with ear-fins
            - Row 2: Top of head (6px wide)
            - Rows 3-4: Head expands (8px wide)
            - Row 5: Eyes (white pixels at x=7,8 and x=14,15)
            - Row 6: Pupils (dark pixels at x=7,8 and x=14,15)
            - Row 7: Cheeks (body color)
            - Row 8: Mouth (2px wide, center)
Row 9:      Neck (narrow, 4px)
Rows 10-16: BODY — tear-drop with belly
            - Row 10: Shoulders expand
            - Rows 11-15: Full body (12px wide)
            - Rows 12-15: Belly (lighter palette[2])
Row 17:     Waist (narrow, 8px)
Rows 18-21: LEGS — 2 legs, 2px each, 4px gap
Rows 22-23: Empty (bottom padding)
```

### Per-Stage Visual Differences (Accent Decorations)
| Stage | Eyes | Wings | Weapon | Antenna | Tail | Accent |
|---|---|---|---|---|---|---|
| egg | wide | closed | none | 0 | 1 | — |
| hatchling | wide | closed | none | 0 | 2 | — |
| baby | wide | closed | none | 0 | 3 | 1 dot |
| child | sparkle | closed | wand | 1 | 3 | 1 dot |
| teen | sparkle | open | rapier | 1 | 4 | 2 dots |
| adult | fierce | open | sword | 2 | 5 | 4 dots (corners) |
| mega | fierce | open-crowned | aurora-blade | 3 | 6 | 1 center dot |

---

## 7. Animation System

### 6 Mood States
| Mood | Speed | Motion | Eyes | Mouth | Arms | Particles |
|---|---|---|---|---|---|---|
| **idle** | 500ms/frame | Gentle bob (±1px) | Normal, random blink | Small 'v' mouth | Hanging | None |
| **happy** | 200ms/frame | Bounce up (−2px) | Normal | Wide smile + corners | Hanging | None |
| **sleepy** | 1000ms/frame | Slow drift (+1px) | Blinking | Straight line | Hanging | "zzz" text float |
| **proud** | 600ms/frame | Lift up (−1px) | Normal | Smile | Hands on hips | None |
| **excited** | 150ms/frame | Shake (±1px X, −2px Y) | Wide open | Open mouth (4px) | Raised up | Sparkles (mega) |
| **focused** | 400ms/frame | Slight lift (−1px) | Brow furrowed | Small line | Hanging | None |

### Animation Details

**Eye Tracking:**
- Pupils shift based on mood: focused=right, sleepy=center, others=sine wave
- Eye shine: 2px white highlight at top-left of each pupil
- Blink: 150ms duration, random interval 3-7 seconds

**Wing Flapping (teen/adult/mega only):**
- Idle: slow oscillation (±4px spread)
- Happy: moderate speed
- Excited: fast flapping
- Wings rendered BEHIND body, with accent color

**Breathing:**
- Subtle scale oscillation via `Math.sin(breathPhase)`
- Phase increments at 0.003 per frame

**Shadow:**
- Ellipse below sprite (28×6px, 20% black)
- Subtle pulse: ±5% scale oscillation

**Particles:**
- Mega stage: floating gold sparkles (every 8 frames)
- Adult stage: rising purple orbs (every 12 frames)
- Particles: 1-2px size, fade out over 30-60 frames

**Speech Bubble:**
- 9px bitmap font, centered
- Box: 1px border (stage primary color), dark background
- Duration: configurable (default 4000ms)
- Position: above sprite (cy=70 on 240px canvas)

---

## 8. UI Components

### Buttons
```css
font-family: 'Players', 'Press Start 2P', monospace;
font-size: 11px;
background: #333;
color: var(--active-primary);
border: 1px solid #555;
padding: 6px 12px;
cursor: pointer;
/* Hover: */ background: #444;
/* Active: */ background: #222;
```
- **NO rounded corners.** EVER.
- **NO box-shadow.** EVER.
- Pixel-perfect 1px borders

### Energy Bar
```
Height:     8px
Background: #1a1a2e
Border:     1px solid #333
Fill:       height: 100%, transition: width 0.3s steps(10)

States:
  high (>60%): #50b848 (green)
  mid (30-60%): #e8a830 (amber)
  low (<30%): #e85050 (red)
```

### Speech Bubble
```
Position:   relative
Background: var(--active-bg)
Border:     2px solid var(--active-border)
Padding:    8px 10px
Font:       9px Press Start 2P
Line-height: 1.6

Arrow:      8px triangle (CSS border trick)
            bottom: -8px, left: 12px
            transparent left/right borders
            solid top border = stage border color
```

### Pixel Box / Card
```css
.pixel-box {
  border: 2px solid var(--active-border);
  background: var(--active-bg);
  image-rendering: pixelated;
}
```

### Scrollbar
```
Width:      8px
Track:      #111 background
Thumb:      #333 background, 1px solid #555 border
```

---

## 9. Sound Design (Chiptune Only)

### Rules
- **Square / triangle / noise channels only.** No sine waves.
- **Single channel per event** (no chords), volume 60-80% peak.
- **Max 4 seconds per sound**, 32 kHz, mono, .ogg format.
- **4-beat-quantised** when played during pet speech.

### Sound Inventory
| Sound | Duration | Type | Description |
|---|---|---|---|
| click | 60ms | square pluck | Short tap feedback |
| bark | 120ms | dual ramp | Click-and-respond |
| happy | ~300ms | 4-note arpeggio | Rising melody |
| evolve | ~600ms | 8-note scale + noise | Bright rising + crackle |
| busy | 90ms | noise tock | Processing indicator |
| error | ~200ms | triangle falling | 4-note descending |
| sleep | ~400ms | soft square | Lullaby-ish |
| hungry | ~200ms | low square | Warning |
| search | ~300ms | rising arpeggio | Looking up |
| think | ~200ms | steady pulse | Processing |

---

## 10. Icon Specification

**Source:** `monagen_icon.webp` — pixel ghost with Indonesian batik headband
**Generated sizes:**
- `32x32.png` — taskbar
- `64x64.png` — Windows taskbar
- `128x128.png` — app icon
- `128x128@2x.png` — retina
- `icon.png` — general purpose
- `icon.ico` — Windows .ico (multi-size)
- `icon.icns` — macOS
- iOS/Android variants (generated by `npx tauri icon`)

---

## 11. Layout Rules

### Window Positions
- Pet window: top-right area (x=100, y=100 default, draggable)
- Chat window: center or toggled via shortcut

### Spacing
- Inner padding: 8-12px
- Border width: 1px (normal), 2px (emphasis)
- Element gap: 4-8px

### Depth Hierarchy
1. Background: solid stage color
2. Grid: 12px lines, 2% opacity
3. Shadow: ellipse, 20% opacity
4. Sprite: pixel grid, 10x scale
5. UI overlay: energy bar, speech bubble
6. Text: stage label, debug info

### Canvas Rendering Order
```
1. Clear canvas (stage bg color)
2. Draw grid (12px spacing, 2% white)
3. Draw particles (behind sprite)
4. Draw shadow (ellipse below)
5. Draw wings (behind body, if applicable)
6. Draw body (main sprite grid)
7. Draw face (eyes, mouth)
8. Draw arms (mood-dependent position)
9. Draw legs
10. Draw crown (mega only)
11. Draw speech bubble (if active)
12. Draw stage label (8px, 30% opacity)
13. Draw particles (in front, for sparkle effects)
```

---

## 12. Interaction Design

### Pet Click
- **4-frame particle burst** with 8-bit star sprites
- No glassy bubbles. Pixel stars only.
- Mood change: idle → happy (2 seconds) → idle

### Pet Drag
- Follows cursor with 1px movement per frame
- No smooth interpolation. Step movement.
- Drops shadow at original position

### Keyboard Shortcut
- `Cmd/Ctrl+Shift+A` — toggle chat window
- Registered via `tauri-plugin-global-shortcut`

### Eye Tracking
- Pet eyes follow cursor with deterministic easing
- Range: ±3px pupil shift
- Speed: follows cursor position, no spring physics

---

## 13. Evolution Visual Transitions

### Evolution Cutscene
- 8-frame animation, 0.66s total
- Frame 1-4: current stage fades out (pixel dissolve)
- Frame 5-8: next stage reveals (pixel reveal)
- Overlay: dithered aurora particles
- Screen flash: 1-frame white overlay at transition

### Stage Transition Effects
| From → To | Background Change | Particle Effect |
|---|---|---|
| egg → hatchling | dark → forest green | Leaf particles |
| hatchling → baby | forest → ocean blue | Water droplets |
| baby → child | ocean → purple mist | Magic sparkles |
| child → teen | purple → crimson | Lightning |
| teen → adult | crimson → deep indigo | Star burst |
| adult → mega | indigo → gold aurora | Cosmic particles |

---

## 14. Accessibility

- **Minimum text size:** 12px body, 8px labels
- **Contrast ratio:** ≥4.5:1 (paper-on-ink)
- **No color-only indicators** — always pair with icon/text
- **Keyboard navigation:** all interactive elements focusable
- **Screen reader:** aria-labels on canvas, buttons, inputs

---

## 15. File Structure Reference

```
apps/desktop/
├── src/
│   ├── app.css                    # Global theme (all CSS vars here)
│   ├── routes/
│   │   ├── +page.svelte           # Main page
│   │   └── +layout.svelte         # Layout wrapper
│   └── lib/
│       ├── render/
│       │   ├── PixelPetV2.svelte  # Main sprite renderer
│       │   ├── masterSprite.ts    # 24x24 grid + palette renderer
│       │   ├── spriteLoader.ts    # Stage palette lookup
│       │   ├── stages.ts          # Stage definitions
│       │   ├── animator.ts        # Mood animation system
│       │   ├── sfx.ts             # Chiptune sound effects
│       │   ├── SpeechBubble.svelte
│       │   ├── EnergyBar.svelte
│       │   ├── EvolutionCutscene.svelte
│       │   └── ...
│       └── audio.ts               # SoundPlayer singleton
├── static/
│   ├── fonts/                     # 1UP, Players TTFs
│   ├── img/sprites/
│   │   ├── stages.json            # Per-stage accent config
│   │   └── frames.json            # Frame definitions
│   └── ogg/                       # Sound assets
└── src-tauri/
    ├── tauri.conf.json            # Window config
    ├── icons/                     # Generated icons
    └── src/
        ├── main.rs                # Desktop entry
        ├── commands.rs            # Tauri IPC handlers
        ├── agent_bridge.rs        # Real LLM agent loop
        └── vibrancy.rs            # Window effects (disabled)
```

---

## 16. Do / Don't Quick Reference

### DO ✅
- Use exact palette colors from section 3
- Use `image-rendering: pixelated` on all canvas
- Use 1px borders (never 0, never 3+)
- Use step-based animations (no easing)
- Use bitmap fonts (1UP, Players, Press Start 2P)
- Keep backgrounds solid (no gradients)
- Render sprites at integer coordinates
- Use `floor()` on all canvas coordinates

### DON'T ❌
- Don't use rounded corners anywhere
- Don't use blur/glassmorphism
- Don't use gradients for backgrounds
- Don't use box-shadow on panels
- Don't use smooth/eased animations
- Don't use system fonts
- Don't use transparency on panels
- Don't use anti-aliased text rendering
- Don't use CSS transitions (use step())
- Don't use emojis in the UI

---

*Document version: 1.0 — July 2026*
*Last updated: Round 21 completion*
*Maintainer: AgenMonster core team*
