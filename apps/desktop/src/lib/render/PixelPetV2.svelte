<script lang="ts">
  import { SpriteAnimator, type SpritePose, type Mood } from './animator';
  import EvolutionCutscene from './EvolutionCutscene.svelte';
  import { getVisual, type StageVisual } from './stageVisuals';

  let { width = 160, height = 120, mood = 'idle', stage = 'egg', facing = 'left', externalSpeech = '' } = $props<{
    width?: number; height?: number; mood?: string; stage?: string;
    facing?: 'left' | 'right';
    externalSpeech?: string;
  }>();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf: number;
  let ready = $state(false);
  let frame = 0;
  let blinkTimer = 0;
  let isBlinking = false;
  let showCutscene = $state(false);
  let lastStage = $state('');
  let speech = $state<string | null>(null);
  let speechTimer = 0;
  let lastTime = performance.now();
  let zPhase = 0;
  let lastExternalSpeech = '';
  let petHoldTimer: number | null = null;
  let petHoldStart = 0;
  const PET_HOLD_MS = 800;

  function onCanvas(el: HTMLCanvasElement) {
    canvas = el;
    el.width = width;
    el.height = height;
    ctx = el.getContext('2d')!;
    ready = true;

    const startPet = (clientY: number) => {
      const rect = el.getBoundingClientRect();
      const y = clientY - rect.top;
      petHoldStart = performance.now();
      petHoldTimer = window.setInterval(() => {
        const elapsed = performance.now() - petHoldStart;
        if (elapsed >= PET_HOLD_MS) {
          window.clearInterval(petHoldTimer!);
          petHoldTimer = null;
          const cx = Math.round(el.width / 2);
          const cy = Math.round(el.height / 2);
          const pal = getColors();
          burstParticles(cx + (Math.random() - 0.5) * 20, cy - 10, pal.accent, 10);
          burstParticles(cx + (Math.random() - 0.5) * 20, cy - 10, pal.body[7], 6);
        }
      }, 50);
    };
    const endPet = (clientX: number, clientY: number) => {
      if (petHoldTimer) { window.clearInterval(petHoldTimer); petHoldTimer = null; }
      const elapsed = performance.now() - petHoldStart;
      if (elapsed < PET_HOLD_MS) {
        const rect = el.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const pal = getColors();
        burstParticles(x, y, pal.accent, 6);
        burstParticles(x, y, pal.body[Math.min(6, pal.body.length - 1)], 4);
      }
    };

    el.addEventListener('mousedown', (e: MouseEvent) => startPet(e.clientY));
    el.addEventListener('mouseup', (e: MouseEvent) => endPet(e.clientX, e.clientY));
    el.addEventListener('mouseleave', (e: MouseEvent) => endPet(e.clientX, e.clientY));
    el.addEventListener('touchstart', (e: TouchEvent) => { e.preventDefault(); startPet(e.touches[0]?.clientY ?? 0); }, { passive: false });
    el.addEventListener('touchend', (e: TouchEvent) => { e.preventDefault(); endPet(e.changedTouches[0]?.clientX ?? width/2, e.changedTouches[0]?.clientY ?? height/2); });

    function loop() {
      try { render(); } catch(e) { console.error('PixelPet render error', e); }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return { destroy() { cancelAnimationFrame(raf); endPet(width/2, height/2); } };
  }

  const animator = new SpriteAnimator();

  // ===== AAA PIXEL PALETTE: 8-color scientific progression =====
  // Design: 2 hues (primary + accent) + neutral scales + outline
  const STAGE_COLORS: Record<string, {
    body: [string, string, string, string, string, string, string, string];
    outline: [string, string];
    eye: [string, string, string, string];
    accent: string;
  }> = {
    egg: {
      body: ['#30204a', '#40306a', '#584898', '#8868d0', '#a888f0', '#c0a8ff', '#d8c8ff', '#f0ecff'],
      outline: ['#18102a', '#30204a'],
      eye: ['#18102a', '#30204a', '#6848c8', '#b898ff'],
      accent: '#a888f0'
    },
    hatchling: {
      body: ['#0a2820', '#0c3c30', '#108048', '#18a870', '#30d098', '#60e8b8', '#90f8d8', '#c8fff0'],
      outline: ['#04180c', '#0a2820'],
      eye: ['#04180c', '#0a2820', '#187858', '#58e8b8'],
      accent: '#30d098'
    },
    baby: {
      body: ['#0a4468', '#0c5c88', '#1080b0', '#18a0e0', '#40c0ff', '#70d8ff', '#a0ecff', '#d8f8ff'],
      outline: ['#062838', '#0a4468'],
      eye: ['#062838', '#0a4468', '#1878b0', '#60c8ff'],
      accent: '#40c0ff'
    },
    child: {
      body: ['#241460', '#381c88', '#5028b8', '#6840e0', '#8860f8', '#a880ff', '#c8a8ff', '#e8d8ff'],
      outline: ['#100830', '#241460'],
      eye: ['#100830', '#241460', '#5838d0', '#a888ff'],
      accent: '#8860f8'
    },
    teen: {
      body: ['#500818', '#781020', '#b82038', '#e83858', '#ff6078', '#ff90a0', '#ffc0c8', '#ffe8ec'],
      outline: ['#280408', '#500818'],
      eye: ['#280408', '#500818', '#c83050', '#ff90a0'],
      accent: '#ff6078'
    },
    adult: {
      body: ['#181048', '#281868', '#402898', '#5840c8', '#7060e0', '#9888f0', '#b8a8ff', '#e0d8ff'],
      outline: ['#0c0828', '#181048'],
      eye: ['#0c0828', '#181048', '#4830b0', '#9888f0'],
      accent: '#7060e0'
    },
    mega: {
      body: ['#402808', '#603810', '#986018', '#c88020', '#f0a838', '#ffc850', '#ffe080', '#fff0c0'],
      outline: ['#201804', '#402808'],
      eye: ['#201804', '#402808', '#c88020', '#ffe080'],
      accent: '#f0a838'
    },
  };

  // ===== GBA PIXEL SPRITE =====
  // Soft thick outlines on every body part, colorful shading.

  function getColors() {
    return STAGE_COLORS[stage] || STAGE_COLORS.egg;
  }

  // ===== COLOR SCIENCE: 8-stop palette helpers =====
  function lerpColor(a: string, b: string, t: number): string {
    const ar = parseInt(a.slice(1,3), 16), ag = parseInt(a.slice(3,5), 16), ab = parseInt(a.slice(5,7), 16);
    const br = parseInt(b.slice(1,3), 16), bg = parseInt(b.slice(3,5), 16), bb = parseInt(b.slice(5,7), 16);
    const rr = Math.round(ar + (br-ar)*t), rg = Math.round(ag + (bg-ag)*t), rb = Math.round(ab + (bb-ab)*t);
    return `#${((rr<<16)|(rg<<8)|rb).toString(16).padStart(6,'0')}`;
  }
  function darken(hex: string, factor = 0.85) {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
    return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
  }
  function lighten(hex: string, factor = 1.15) {
    return darken(hex, factor);
  }
  function withAlpha(hex: string, a: number) {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ===== DITHERING PATTERNS =====
  // Deterministic hash for pixel-coherent dithering (no Math.random flicker)
  function hashPixel(x: number, y: number): number {
    let h = (x * 374761393 + y * 668265263 + 1274126177) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    return (h & 0x7fffffff) % 16;
  }
  function dither2x2(x: number, y: number): 0|1 {
    const idx = ((y & 1) << 1) | (x & 1);
    const threshold = [0, 2, 1, 3][idx];
    return threshold < 2 ? 1 : 0;
  }
  function dither4x4(x: number, y: number): 0|1 {
    const idx = ((y & 3) << 2) | (x & 3);
    const threshold = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5][idx];
    return threshold < 8 ? 1 : 0;
  }
  function ditheredRect(x: number, y: number, w: number, h: number, colorA: string, colorB: string, intensity = 0.5): void {
    const useA = Math.floor(intensity * 16);
    ctx.save();
    for (let py = Math.round(y); py < Math.round(y + h); py++) {
      for (let px = Math.round(x); px < Math.round(x + w); px++) {
        const d = hashPixel(px, py);
        ctx.fillStyle = d < useA ? colorA : colorB;
        ctx.fillRect(px, py, 1, 1);
      }
    }
    ctx.restore();
  }

  function fillBordered(x: number, y: number, w: number, h: number, color: string, outline: string) {
    const ow = w + 4;
    const oh = h + 4;
    ctx.fillStyle = outline;
    ctx.fillRect(Math.round(x - 2), Math.round(y - 2), ow, oh);
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  function drawDitheredBand(x: number, y: number, w: number, h: number, colorTop: string, colorBot: string): void {
    ctx.save();
    for (let py = Math.round(y); py < Math.round(y + h); py++) {
      const t = (py - y) / Math.max(1, h - 1);
      const col = lerpColor(colorTop, colorBot, t);
      for (let px = Math.round(x); px < Math.round(x + w); px++) {
        if (dither4x4(px, py)) {
          ctx.fillStyle = col;
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
    ctx.restore();
  }

  function drawGroundReflection(
  pal: ReturnType<typeof getColors>,
  groundY: number,
  cx: number,
  facing: 'left' | 'right',
  px: number,
  bodyBob: number,
  outline: string
) {
  const dir = facing === 'left' ? 1 : -1;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = outline;

  const bodyY = groundY - 4 * px + bodyBob * px * 0.8;
  const bodyW = 6 * px;
  const bodyH = 5 * px;
  const bodyX = cx - px * 1 + dir * px * 1;

  const headY = groundY - 9 * px + bodyBob * px * 0.4;
  const headW = 6 * px;
  const headH = 5 * px;
  const headX = cx - px * 1 + dir * px * 1;

  const legY = groundY + 2 * px + bodyBob * px;
  const legW = 2 * px;

  ctx.save();
  ctx.translate(cx, groundY + 1);
  ctx.scale(1, -0.35);
  ctx.translate(-cx, -groundY - 1);

  ctx.fillRect(Math.round(headX), Math.round(headY), headW, headH);
  ctx.fillRect(Math.round(bodyX), Math.round(bodyY), bodyW, bodyH);
  for (let i = 0; i < 2; i++) {
    const lx = cx - px * 1 + (i === 0 ? -dir * px * 3 : dir * px * 3);
    ctx.fillRect(Math.round(lx), Math.round(legY + 3), legW, 3 * px);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

  function drawSideView(pose: SpritePose, pal: ReturnType<typeof getColors>, breathScale = 1) {
    const px = Math.max(3, Math.floor(Math.min(width, height) / 20));
    const cx = Math.round(width / 2) + (facing === 'right' ? 2 * px : 0);
    const cy = Math.round(height / 2);

    const [c1, c2, c3, c4, c5, c6, c7] = pal.body;
    const outline = pal.outline[0];

    const p = (x: number, y: number) => facing === 'left' ? cx + x * px : cx - (x + 1) * px;
    const bodyBob = pose.bodyBob || 0;
    const headBob = pose.headBob || 0;
    const legSpread = pose.legSpread || 0;
    const mouthType = pose.mouthType || 'normal';
    const showEye = pose.showEye !== false;
    const showMouth = pose.showMouth !== false;

    const idleFidget = pose.idleFidget || { headTilt: 0, wingFlap: 0, bodySway: 0 };
    const headTilt = idleFidget.headTilt;
    const wingFlap = idleFidget.wingFlap;
    const bodySway = idleFidget.bodySway;
    const walkShift = pose.walkShift || 0;

    const sqX = pose.squashX || 1;
    const sqY = pose.squashY || 1;
    const groundY = cy + Math.round(px * 6.5);

    ctx.save();
    ctx.translate(cx + bodySway * px * 0.5 + walkShift * px * 0.5, groundY);
    ctx.scale(sqX * breathScale, sqY * breathScale);
    ctx.translate(-(cx + bodySway * px * 0.5 + walkShift * px * 0.5), -groundY);

    const dropShadowOff = Math.round(px * 0.6);
    const dropShadowBlur = Math.round(px * 0.8);

    if (stage !== 'egg') {
      ctx.shadowColor = 'rgba(16,8,24,0.35)';
      ctx.shadowBlur = dropShadowBlur;
      ctx.shadowOffsetX = Math.round(dropShadowOff * 0.3);
      ctx.shadowOffsetY = Math.round(dropShadowOff * 0.6);
    }

    if (stage === 'egg') {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      const eggY = Math.round(cy + 6 * px + bodyBob * px);
       ditheredRect(cx - 5 * px, eggY - 6 * px, 10 * px, 12 * px, c6, c5, 0.7);

       ctx.save();
       ctx.globalAlpha = 0.2 + Math.sin(frame * 0.05) * 0.1;
       ctx.strokeStyle = outline;
       ctx.lineWidth = 1;
       for (let i = 0; i < 3; i++) {
         const crackX = cx - 3 * px + i * 3 * px;
         const crackY1 = eggY - 4 * px;
         const crackY2 = eggY + 2 * px;
         ctx.beginPath();
         ctx.moveTo(crackX, crackY1);
         ctx.lineTo(crackX - 1 + (Math.sin(frame * 0.05 + i) * 0.5), crackY2);
         ctx.stroke();
       }
        ctx.restore();
        if (frame % 6 === 0 && particles.length < MAX_PARTICLES - 5) {
          const pal = getColors();
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * px * 2;
          spawnParticle(
            cx + Math.cos(angle) * dist,
            eggY + Math.sin(angle) * dist * 0.5,
            pal.body[6], 'sparkle'
          );
        }
      } else {
       const shadowCx = cx;
       const shadowCy = Math.round(cy + 6 * px + bodyBob * px);
       let shadowRx = Math.round(4.5 * px);
       let shadowRy = Math.round(px * 0.8);
       let shadowColor = 'rgba(8,4,16,0.25)';
       let shadowAlpha = 0.55;

       if (stage === 'egg') {
         shadowRx = Math.round(5.5 * px);
         shadowRy = Math.round(px * 1.2);
         shadowColor = 'rgba(8,4,16,0.15)';
         shadowAlpha = 0.7;
       } else if (stage === 'mega') {
         shadowRx = Math.round(3 * px);
         shadowRy = Math.round(px * 0.4);
         shadowColor = 'rgba(255,192,50,0.08)';
         shadowAlpha = 0.3;
       } else if (stage === 'adult') {
         shadowRx = Math.round(4 * px);
         shadowRy = Math.round(px * 0.6);
         shadowColor = 'rgba(8,4,16,0.35)';
         shadowAlpha = 0.4;
       }

       ctx.shadowColor = 'transparent';
       ctx.shadowBlur = 0;
       ctx.shadowOffsetX = 0;
       ctx.shadowOffsetY = 0;
       ditheredRect(shadowCx - shadowRx, shadowCy - shadowRy, shadowRx * 2, shadowRy * 2, shadowColor, 'rgba(8,4,16,', shadowAlpha);

       drawGroundReflection(pal, groundY, cx, facing, px, bodyBob, outline);

      ctx.shadowColor = 'rgba(16,8,24,0.35)';
      ctx.shadowBlur = dropShadowBlur;
      ctx.shadowOffsetX = Math.round(dropShadowOff * 0.3);
      ctx.shadowOffsetY = Math.round(dropShadowOff * 0.6);

      const legY = cy + 4 * px + bodyBob * px;
      const legW = 2 * px;

      [ [p(2,0), legSpread], [p(8,0), legSpread > 0 ? -legSpread : legSpread] ].forEach(([lx, ls]) => {
        const legIdx = lx < cx ? 0 : 1;
        const footContact = Math.abs(Math.sin((frame * 0.012) + (legIdx * Math.PI))) > 0.85;
        const legHeight = footContact ? 4 * px - px * 0.3 : 4 * px;
        const legOffsetY = footContact ? Math.round(px * 0.2) : 0;
        ctx.fillStyle = outline;
        ctx.fillRect(Math.round(lx as number) - 1, Math.round(legY - 1) + legOffsetY, legW + 2, legHeight + 2 + legOffsetY);
        ctx.fillStyle = c2;
        ctx.fillRect(Math.round(lx as number), Math.round(legY) + legOffsetY, legW, legHeight);
        ctx.fillStyle = c3;
        ctx.fillRect(Math.round(lx as number), Math.round(legY) + legOffsetY, legW, 1 * px);
        ctx.fillStyle = c5;
        ctx.fillRect(Math.round(lx as number), Math.round(legY + 3 * px) + legOffsetY, legW, px);
        if ((ls as number) > 0) {
          ctx.fillStyle = c6;
          ctx.fillRect(Math.round((lx as number) + (facing === 'right' ? 1 : -1)), Math.round(legY + 2 * px), Math.round(px * 0.8), px);
        }
      });

      const bodyY = cy + bodyBob * px;
      ctx.fillStyle = outline;
      ctx.fillRect(Math.round(p(3, 2) - 1), Math.round(bodyY - 1), 6 * px + 2, 5 * px + 2);
      ctx.fillStyle = c2;
      ctx.fillRect(Math.round(p(3, 2)), Math.round(bodyY), 6 * px, 5 * px);
      ctx.fillStyle = c3;
      ctx.fillRect(Math.round(p(3, 2)), Math.round(bodyY), 6 * px, 1 * px);
      ctx.fillStyle = c5;
      ctx.fillRect(Math.round(p(3, 2)), Math.round(bodyY + 3 * px), 6 * px, 1 * px);
      ctx.fillStyle = c6;
      ctx.fillRect(Math.round(p(4, 2)), Math.round(bodyY), 3 * px, 1 * px);

      ctx.fillStyle = pal.accent;
      ctx.fillRect(Math.round(p(4, 3)), Math.round(bodyY + 1 * px), 3 * px, 2 * px);

      const headTiltOffset = Math.round(headTilt * px * 0.3);
      const headY = cy - 4 * px + headBob * px + headTiltOffset;
      ctx.fillStyle = outline;
      ctx.fillRect(Math.round(p(2, -3) - 1), Math.round(headY - 1), 6 * px + 2, 5 * px + 2);
      ctx.fillStyle = c3;
      ctx.fillRect(Math.round(p(2, -3)), Math.round(headY), 6 * px, 5 * px);
      ctx.fillStyle = c5;
      ctx.fillRect(Math.round(p(2, -3)), Math.round(headY), 6 * px, 1 * px);
      ctx.fillStyle = c6;
      ctx.fillRect(Math.round(p(3, -3)), Math.round(headY), 3 * px, 2 * px);

      if (facing === 'left') {
        ctx.fillStyle = c6;
        ctx.fillRect(Math.round(p(3, -3)), Math.round(headY), px, 5 * px);
      }

      const earFlapOffset = Math.round(wingFlap * px * 0.4 * (['teen','adult','mega'].includes(stage) ? 1 : 0));
      const earData: Array<[number, number]> = [
        [p(1, -1), headY - 2*px + earFlapOffset],
        [p(8, -1), headY - 2*px + earFlapOffset]
      ];
      earData.forEach(([ex, ey]) => {
        ctx.fillStyle = outline;
        ctx.fillRect(Math.round(ex), Math.round(ey) - 1, 2*px + 2, 2*px + 2);
        ctx.fillStyle = c5;
        ctx.fillRect(Math.round(ex) + 1, Math.round(ey), 2*px, 2*px);
        drawDitheredBand(
          Math.round(ex) + 1, Math.round(ey) + px,
          2*px, px,
          c5, c3
        );
      });

      if (stage === 'mega') {
        const crownY = Math.round(headY - 2 * px);
        const crownPulse = 0.5 + Math.sin(frame * 0.03) * 0.5;
        for (let i = 0; i < 5; i++) {
          const cx2 = Math.round(p(1 + i * 1.2, -1));
          const spikeH = 1 + (i === 2 ? 2 : 0);
          ctx.fillStyle = i === 2 ? c6 : c4;
          ctx.fillRect(cx2, crownY - spikeH, 1, spikeH);
          if (i === 2) {
            ctx.fillStyle = pal.accent;
            ctx.globalAlpha = 0.4 + crownPulse * 0.3;
            ctx.fillRect(cx2 - 1, crownY - spikeH - 1, 3, 3);
            ctx.globalAlpha = 1;
          }
        }
        ctx.fillStyle = c2;
        ctx.fillRect(Math.round(p(1, -1)), crownY, 6 * px, 1);
      }

      if (showEye) {
        const eyeY = Math.round(headY + px);
        const pupilOff = pose.eyeLook || 0;

        ctx.fillStyle = outline;
        ctx.fillRect(Math.round(p(2, -2) - 1), eyeY - 1, 2*px + 2, 2*px + 2);

        ctx.fillStyle = pal.eye[2];
        ctx.fillRect(Math.round(p(2, -2)), eyeY, 2*px, 2*px);

        ctx.fillStyle = pal.eye[3];
        ctx.fillRect(Math.round(p(2, -2) + px * 0.15), eyeY + Math.round(px * 0.15), Math.round(px * 1.6), px);

        ctx.fillStyle = pal.eye[2];
        ctx.fillRect(Math.round(p(2, -2) + px * 0.15), eyeY + px, Math.round(px * 1.5), Math.round(px * 0.55));

        ctx.fillStyle = pal.eye[0];
        ctx.fillRect(Math.round(p(3, -2) + pupilOff), Math.round(eyeY + px), px, px);
        ctx.fillRect(Math.round(p(2, -2) + pupilOff + Math.round(px * 0.3)), Math.round(eyeY + Math.round(px * 1.3)), Math.round(px * 0.5), Math.round(px * 0.5));

        ctx.fillStyle = pal.eye[3] || c7;
        ctx.fillRect(Math.round(p(2, -2) + Math.round(px * 0.3)), Math.round(eyeY + Math.round(px * 0.25)), Math.round(px * 0.35), Math.round(px * 0.35));
        ctx.fillRect(Math.round(p(3, -2) + pupilOff + Math.round(px * 0.4)), Math.round(eyeY + Math.round(px * 1.1)), Math.round(px * 0.3), Math.round(px * 0.3));

        if ((mood === 'happy' || mood === 'proud' || mood === 'excited') && showEye && !isBlinking) {
          const sparklePhase = Math.sin(frame * 0.1 + (facing === 'left' ? 1 : 2)) > 0;
          let sparkleAlpha = 0;
          if (stage === 'mega') sparkleAlpha = 0.6 + (sparklePhase ? 0.4 : 0);
          else if (stage === 'adult') sparkleAlpha = 0.4 + (sparklePhase ? 0.3 : 0);
          else sparkleAlpha = 0.3 + (sparklePhase ? 0.2 : 0);
          ctx.fillStyle = withAlpha(pal.accent, sparkleAlpha);
          const sparkleX = Math.round(p(2, -2) + px * 0.8);
          const sparkleY = Math.round(eyeY + px * 0.2);
          ctx.fillRect(sparkleX, sparkleY, Math.max(1, Math.round(px * 0.4)), Math.max(1, Math.round(px * 0.4)));
        }

        if (mood === 'thinking' && showEye) {
          ctx.fillStyle = withAlpha(c7, 0.8);
          ctx.fillRect(Math.round(p(2, -2) + px * 0.8), Math.round(eyeY + px * 0.8), Math.max(1, Math.round(px * 0.3)), Math.max(1, Math.round(px * 0.3)));
        }
      } else {
        ctx.fillStyle = outline;
        ctx.fillRect(Math.round(p(2, -1)), Math.round(headY + 2 * px), 3 * px, px);
        ctx.fillStyle = pal.eye[0];
        ctx.fillRect(Math.round(p(2, -1) + 1), Math.round(headY + 2 * px + 1), 3 * px - 2, px - 2);
      }

      if (showMouth) {
        const mouthY = Math.round(headY + 3 * px);
        if (mouthType === 'happy') {
          ctx.fillStyle = outline;
          ctx.fillRect(Math.round(p(3, 0) - 1), mouthY - 1, 2*px + 2, px + 2);
          ctx.fillStyle = pal.eye[0];
          ctx.fillRect(Math.round(p(3, 0)), mouthY, 2*px, px);
          ctx.fillStyle = pal.accent;
          ctx.fillRect(Math.round(p(3, 0)), mouthY + Math.round(px * 0.3), 2*px, Math.max(1, Math.round(px * 0.4)));
        } else if (mouthType === 'open') {
          ctx.fillStyle = outline;
          ctx.fillRect(Math.round(p(3, 0) - 1), mouthY - 1, px + 2, px + 2);
          ctx.fillStyle = pal.eye[0];
          ctx.fillRect(Math.round(p(3, 0)), mouthY, px, px);
          ctx.fillStyle = pal.accent;
          ctx.fillRect(Math.round(p(3, 0) + 1), mouthY + 1, px - 2, px - 2);
        } else if (mouthType === 'sad') {
          ctx.fillStyle = outline;
          ctx.fillRect(Math.round(p(3, 0) - 1), mouthY - 1, px + 2, px + 2);
          ctx.fillStyle = c1;
          ctx.fillRect(Math.round(p(3, 0)), mouthY, px, px);
        } else {
          ctx.fillStyle = outline;
          ctx.fillRect(Math.round(p(4, 0) - 1), mouthY - 1, px + 2, px + 2);
          ctx.fillStyle = c1;
          ctx.fillRect(Math.round(p(4, 0)), mouthY, px, px);
        }
      }

      if (['teen', 'adult', 'mega'].includes(stage)) {
        const whiskerY = Math.round(headY + 2 * px);
        const whiskerColor = outline;
        ctx.fillStyle = whiskerColor;
        for (let i = 0; i < 3; i++) {
          const whiskerSeed = Math.sin(frame * 0.1 + i) * 0.2;
          const wx = Math.round(p(1 - i + whiskerSeed, 1));
          const whiskerLen = Math.max(1, Math.round((px - i) * (0.8 + Math.sin(frame * 0.05 + i) * 0.2)));
          ctx.fillRect(wx, whiskerY, whiskerLen, 1);
          const wx2 = Math.round(p(7 + i - whiskerSeed, 1));
          const whiskerLen2 = Math.max(1, Math.round((px - i) * (0.8 + Math.sin(frame * 0.05 + i + 1) * 0.2)));
          ctx.fillRect(wx2, whiskerY, whiskerLen2, 1);
        }
      }

      if (showEye && mood === 'angry') {
        ctx.fillStyle = outline;
        ctx.fillRect(Math.round(p(2, -3)), Math.round(headY) - 1, 2*px, px);
        ctx.fillRect(Math.round(p(4, -3)), Math.round(headY) - 1, 2*px, px);
        ctx.fillStyle = c1;
        ctx.fillRect(Math.round(p(2, -3)) + 1, Math.round(headY), 2*px - 2, Math.max(1, px - 2));
        ctx.fillRect(Math.round(p(4, -3)) + 1, Math.round(headY), 2*px - 2, Math.max(1, px - 2));
      }
      if (showEye && (mood === 'sleepy' || mood === 'tired')) {
        ctx.fillStyle = outline;
        ctx.fillRect(Math.round(p(2, -2)), Math.round(headY + px + 1), 2*px, Math.max(1, Math.round(px * 0.5)));
      }
      if (showMouth && (mood === 'sad' || mood === 'frustrated')) {
        const tearX = facing === 'left' ? Math.round(p(1, -1)) : Math.round(p(5, -1));
        const tearY = Math.round(headY + 2 * px);
        ctx.fillStyle = '#60c8ff';
        ctx.fillRect(tearX, tearY, px, Math.round(px * 1.2));
        ctx.fillStyle = pal.eye[3] || c7;
        ctx.fillRect(tearX, tearY, px, Math.round(px * 0.4));
      }
      if ((mood === 'happy' || mood === 'proud') && showMouth) {
        const blushX = facing === 'left' ? Math.round(p(5, 1)) : Math.round(p(0, 1));
        const blushY = Math.round(headY + 3 * px);
        ctx.fillStyle = withAlpha('#ff80a0', 0.25);
        ctx.fillRect(blushX, blushY, 2*px, px);
      }
      if (mood === 'thinking' && showEye) {
        const sweatX = facing === 'left' ? Math.round(p(5, -2)) : Math.round(p(0, -2));
        ctx.fillStyle = '#60c8ff';
        ctx.fillRect(sweatX, Math.round(headY - px), px, Math.round(px * 1.4));
        ctx.fillStyle = '#a8e8ff';
        ctx.fillRect(sweatX, Math.round(headY - px), Math.round(px * 0.5), Math.round(px * 0.4));
      }
      if (mood === 'excited' && showEye && !isBlinking) {
        const starX = Math.round(p(2, -2));
        const starY = Math.round(headY + px);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(starX, starY, 1, 3);
        ctx.fillRect(starX + 1, starY + 1, 1, 1);
        ctx.fillRect(starX + 2, starY, 1, 3);
      }
      if (['teen', 'adult', 'mega'].includes(stage)) {
        const isHappyMood = mood === 'happy' || mood === 'proud' || mood === 'excited';
        const wagFreq = isHappyMood ? 0.06 : 0.02;
        const wagAmp = isHappyMood ? 1.2 : 0.6;
        const tailSway = Math.sin(frame * wagFreq + (facing === 'right' ? Math.PI : 0)) * wagAmp;
        const tailY = Math.round(bodyY + px * 3);
        const tailLen = stage === 'mega' ? 4 : 3;
        const tailOffset = facing === 'left' ? -px * 0.5 : px * 0.5;

        let tailBaseColor: string, tailTipColor: string;
        if (isHappyMood) {
          tailBaseColor = withAlpha(pal.accent, 0.7);
          tailTipColor = withAlpha(pal.accent, 0.9);
        } else if (mood === 'sad' || mood === 'tired') {
          tailBaseColor = pal.body[2];
          tailTipColor = pal.body[3];
        } else if (mood === 'angry' || mood === 'frustrated') {
          tailBaseColor = pal.eye[2];
          tailTipColor = pal.body[6];
        } else {
          tailBaseColor = c3;
          tailTipColor = c2;
        }

        if (stage === 'mega') {
          ctx.fillStyle = tailBaseColor;
          for (let i = 0; i < tailLen; i++) {
            const segX = Math.round(p(facing === 'left' ? -1 : 8, 0) + tailOffset + tailSway * i * 0.3);
            ctx.fillRect(segX + i * (facing === 'left' ? -1 : 1), tailY + Math.round(tailSway * i * 0.2), 1, px);
          }
          ctx.fillStyle = tailTipColor;
          ctx.fillRect(Math.round(p(facing === 'left' ? -1 : 8, 0) + tailOffset + tailSway * tailLen * 0.3), tailY, 1, px);
        } else {
          ctx.fillStyle = tailBaseColor;
          const baseX = Math.round(p(facing === 'left' ? -1 : 8, 0) + tailOffset + tailSway * 0.5);
          ctx.fillRect(baseX, tailY, 1, tailLen * px);
          ctx.fillRect(baseX + (facing === 'left' ? -1 : 1), tailY + 1, 1, (tailLen - 1) * px);
          ctx.fillStyle = c2;
          ctx.fillRect(baseX, tailY + tailLen * px, 1, px);
        }
      }

      const vis = getVisual(stage);
      const weapon = vis.weaponStyle;
      if (weapon !== 'none' && stage !== 'egg') {
        const weaponSway = walkShift * px * 0.3;
        let handX: number, handY: number, wepLen: number, wepColor: string;
        if (facing === 'left') {
          handX = Math.round(p(1, 2) + px * 0.5 + weaponSway);
        } else {
          handX = Math.round(p(8, 2) - px * 0.5 + weaponSway);
        }
        handY = Math.round(bodyY + px * 1.5);

        if (weapon === 'sword') {
          wepLen = Math.round(px * 3);
          wepColor = c7;
          const swordPulse = 0.3 + Math.sin(frame * 0.02) * 0.3;
          ctx.fillStyle = withAlpha(pal.accent, 0.4 + swordPulse);
          ctx.fillRect(handX + (facing === 'left' ? -wepLen - 1 : 2), handY - 1, wepLen, 1);
          ctx.globalAlpha = 1;
          ctx.fillStyle = c1;
          ctx.fillRect(handX + (facing === 'left' ? -wepLen - 1 : 2), handY, wepLen, 1);
          ctx.fillStyle = outline;
          ctx.fillRect(handX + (facing === 'left' ? -wepLen - 2 : 3), handY - 1, 1, 2);
          ctx.fillStyle = pal.body[6];
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(handX + (facing === 'left' ? -wepLen - 2 : 3), handY - 1 + i, 1, 1);
          }
        } else if (weapon === 'staff') {
          wepLen = Math.round(px * 4);
          ctx.fillStyle = c1;
          ctx.fillRect(handX + (facing === 'left' ? -1 : 1), handY - wepLen, 1, wepLen);
          ctx.fillStyle = pal.accent;
          ctx.fillRect(handX + (facing === 'left' ? -1 : 1), handY - wepLen - 2, 1, 2);
          ctx.fillStyle = withAlpha(pal.accent, 0.4 + Math.sin(frame * 0.03) * 0.2);
          ctx.fillRect(handX + (facing === 'left' ? -2 : 0), handY - wepLen - 2, 3, 1);
          ctx.globalAlpha = 1;
        } else if (weapon === 'scepter') {
          wepLen = Math.round(px * 3.5);
          const scepterFloat = Math.sin(frame * 0.012) * 0.4;
          const scepterFloatY = Math.round(scepterFloat);
          ctx.fillStyle = pal.body[6];
          ctx.fillRect(handX + (facing === 'left' ? -wepLen - 1 : 2), handY - 1 + scepterFloatY, wepLen, 1);
          ctx.fillStyle = pal.accent;
          const gemX = handX + (facing === 'left' ? -wepLen + 1 : wepLen);
          const gemY = handY - Math.round(px * 1.5) + scepterFloatY;
          const gemPulse = 0.4 + Math.sin(frame * 0.03) * 0.4;
          ctx.fillStyle = withAlpha(pal.accent, 0.5 + gemPulse * 0.3);
          ctx.fillRect(gemX, gemY, 1, 1);
          ctx.fillRect(gemX, gemY + 1, 1, 1);
          const gemGlowX = Math.round(gemX + Math.sin(frame * 0.012) * 0.5);
          const gemGlowY = Math.round(gemY - scepterFloat * 0.3);
          ctx.fillStyle = withAlpha(pal.accent, 0.2 + Math.sin(frame * 0.03) * 0.1);
          ctx.fillRect(gemGlowX, gemGlowY, 2, 2);
          ctx.globalAlpha = 1;
          ctx.fillStyle = c1;
          ctx.fillRect(handX + (facing === 'left' ? -wepLen - 1 : 2), handY + scepterFloatY, wepLen, 1);
        } else if (weapon === 'wand') {
          wepLen = Math.round(px * 2.5);
          ctx.fillStyle = c1;
          ctx.fillRect(handX + (facing === 'left' ? -wepLen - 1 : 2), handY - 1, wepLen, 1);
          ctx.fillStyle = pal.accent;
          ctx.fillRect(handX + (facing === 'left' ? -wepLen - 1 : wepLen + 1), handY - 1, 1, 1);
          ctx.fillStyle = withAlpha(pal.accent, 0.5 + Math.sin(frame * 0.04) * 0.3);
          ctx.fillRect(handX + (facing === 'left' ? -wepLen - 1 : wepLen + 1), handY - 2, 1, 1);
          ctx.globalAlpha = 1;
        }
      }
      if (['teen', 'adult', 'mega'].includes(stage)) {
        const wingFlapOffset = Math.round(wingFlap * px * 0.5);
        const wingY = Math.round(bodyY + px * 1.5 - wingFlapOffset * 0.3);
        const wingLen = Math.round(px * 2.5);
        ctx.fillStyle = outline;
        ctx.fillRect(Math.round(p(-2, 0)) - 1, wingY - 1, wingLen, wingLen + 2 + wingFlapOffset);
        ctx.fillStyle = c4;
        ctx.fillRect(Math.round(p(-2, 0)), wingY, wingLen - 2, wingLen + wingFlapOffset);
        ctx.fillStyle = c2;
        ctx.fillRect(Math.round(p(-2, 0) + px * 0.5), wingY + wingFlapOffset * 0.3, wingLen - 4, wingLen - 2 + wingFlapOffset * 0.8);

        ctx.fillStyle = withAlpha(outline, 0.12);
        for (let dy = 0; dy < wingLen - 4; dy += 2) {
          for (let dx = 0; dx < wingLen - 4; dx += 3) {
            if ((dy + dx) % 4 === 0) {
              ctx.fillRect(Math.round(p(-2, 0) + px * 0.5) + dx, wingY + wingFlapOffset * 0.3 + dy, 1, 1);
            }
          }
        }
        ctx.globalAlpha = 1;
        ctx.fillRect(Math.round(p(9, 0)) + 1, wingY - 1, wingLen, wingLen + 2 + wingFlapOffset);
        ctx.fillStyle = c4;
        ctx.fillRect(Math.round(p(9, 0)) + 3, wingY, wingLen - 2, wingLen + wingFlapOffset);
        ctx.fillStyle = c2;
        ctx.fillRect(Math.round(p(9, 0)) + 3 + px * 0.5, wingY + wingFlapOffset * 0.3, wingLen - 4, wingLen - 2 + wingFlapOffset * 0.8);

        if (stage === 'mega') {
          const cosmicWingSpan = Math.round(px * 3.5);
          const cosmicWingH = Math.round(px * 4);
          ctx.fillStyle = withAlpha(pal.accent, 0.15);
          ctx.fillRect(Math.round(p(-4, -2)) - 1, wingY - 1, cosmicWingSpan, cosmicWingH + 2);
          ctx.fillRect(Math.round(p(10, -2)), wingY - 1, cosmicWingSpan, cosmicWingH + 2);
          ctx.globalAlpha = 1;

          const starOffsets = [[-3, -1], [-5, 1], [-4, 3], [11, -1], [12, 1], [13, 3]];
          ctx.fillStyle = pal.accent;
          starOffsets.forEach(([ox, oy]) => {
            ctx.fillRect(Math.round(p(ox, oy)), wingY + Math.round(px * 0.5), 1, 1);
          });
        }
      }
    }

    ctx.restore();
  }

  // ===== PARTICLES (pooled, pixel-perfect) =====
  interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    life: number; maxLife: number;
    color: string; size: number;
    kind: 'sparkle' | 'dust' | 'heart' | 'zzz' | 'petal' | 'puff';
    trail?: { x: number; y: number }[];
  }
  const MAX_PARTICLES = 60;
  let particles: Particle[] = [];
  const TRAIL_LENGTH = 4;

   // ===== MEGA ORBIT PARTICLES =====
   interface OrbitParticle {
     angle: number;
     radius: number;
     speed: number;
     size: number;
     color: string;
     yOffset: number;
     life: number;
     maxLife: number;
   }
   const MAX_ORBIT = 8;
   let orbitParticles: OrbitParticle[] = [];

   function spawnOrbitParticle(cx: number, cy: number, pal: string[]) {
     if (orbitParticles.length >= MAX_ORBIT) return;
     const angle = Math.random() * Math.PI * 2;
     const radius = 10 + Math.random() * 6;
     orbitParticles.push({
       angle, radius,
       speed: 0.015 + Math.random() * 0.01,
       size: 0.8 + Math.random() * 0.6,
       color: pal[Math.floor(Math.random() * 3) + 6],
       yOffset: -Math.random() * 4,
       life: 0,
       maxLife: 120 + Math.random() * 80,
     });
   }

   function updateOrbitParticles() {
     for (let i = orbitParticles.length - 1; i >= 0; i--) {
       const p = orbitParticles[i];
       p.angle += p.speed;
       p.life++;
       if (p.life >= p.maxLife) {
         orbitParticles[i] = orbitParticles[orbitParticles.length - 1];
         orbitParticles.pop();
       }
     }
   }

   function drawOrbitParticles(cx: number, cy: number) {
     ctx.save();
     for (const p of orbitParticles) {
       const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.7;
       ctx.globalAlpha = alpha;
       ctx.fillStyle = p.color;
       const ox = Math.round(Math.cos(p.angle) * p.radius);
       const oy = Math.round(Math.sin(p.angle) * p.radius * 0.5 + p.yOffset);
       const s = Math.max(1, Math.round(p.size));
       ctx.fillRect(cx + ox - Math.round(s / 2), cy + oy - Math.round(s / 2), s, s);
     }
     ctx.restore();
   }

   function spawnParticle(x: number, y: number, color: string, kind: Particle['kind'] = 'sparkle') {
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({
      x, y,
       vx: (Math.random() - 0.5) * (kind === 'heart' ? 0.3 : kind === 'puff' ? 0.2 : kind === 'petal' ? 0.4 : 0.6),
       vy: kind === 'zzz' ? -0.4 : kind === 'heart' ? -0.6 : kind === 'puff' ? -0.15 : kind === 'petal' ? -0.3 : -Math.random() * 0.9 - 0.2,
      life: 0,
       maxLife: kind === 'zzz' ? 50 + Math.random() * 30 : kind === 'petal' ? 60 + Math.random() * 40 : kind === 'puff' ? 80 + Math.random() * 40 : 25 + Math.random() * 20,
       color,
       size: kind === 'zzz' ? 1.5 : kind === 'petal' ? 2 + Math.random() * 1 : kind === 'puff' ? 3 + Math.random() * 2 : 1 + Math.random() * 0.8,
      kind,
      trail: [],
    });
  }

  function burstParticles(x: number, y: number, color: string, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 0.8 + Math.random() * 0.8;
      if (particles.length >= MAX_PARTICLES) break;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.3,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        color,
        size: 1 + Math.random() * 0.6,
        kind: 'sparkle',
        trail: [],
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.trail && p.trail.length > TRAIL_LENGTH) {
        p.trail.shift();
      }
      if (frame % 2 === 0 && (p.kind === 'heart' || p.kind === 'zzz')) {
        if (!p.trail) p.trail = [];
        p.trail.push({ x: p.x, y: p.y });
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.kind === 'heart') p.vy -= 0.003;
      if (p.kind === 'zzz') { p.vx *= 0.98; p.vy *= 0.96; }
      else p.vy += 0.012;
      p.life++;
      if (p.life >= p.maxLife) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = 1 - p.life / p.maxLife;
      const s = Math.max(1, Math.round(p.size));

      if (p.trail && p.trail.length > 1) {
        for (let ti = 0; ti < p.trail.length; ti++) {
          const tp = p.trail[ti];
          const trailAlpha = (ti / p.trail.length) * alpha * 0.35;
          ctx.globalAlpha = trailAlpha;
          ctx.fillStyle = p.color;
          const ts = Math.max(1, Math.round(s * 0.7));
          if (p.kind === 'heart') {
            ctx.fillRect(Math.round(tp.x), Math.round(tp.y), ts, ts);
            ctx.fillRect(Math.round(tp.x) + ts, Math.round(tp.y), ts, ts);
          } else if (p.kind === 'zzz') {
            ctx.font = `${ts * 2.5}px monospace`;
            ctx.textAlign = 'left';
            ctx.fillText('z', Math.round(tp.x), Math.round(tp.y));
          } else if (p.kind === 'petal') {
            ctx.fillRect(Math.round(tp.x), Math.round(tp.y), ts, 1);
            ctx.fillRect(Math.round(tp.x) + 1, Math.round(tp.y) + 1, ts - 2, 1);
          } else if (p.kind === 'puff') {
            ctx.fillRect(Math.round(tp.x), Math.round(tp.y), ts + 1, ts + 1);
          } else {
            ctx.fillRect(Math.round(tp.x), Math.round(tp.y), ts, ts);
          }
        }
      }

      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = p.color;
      if (p.kind === 'heart') {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        ctx.fillRect(Math.round(p.x) + s, Math.round(p.y), s, s);
        ctx.fillRect(Math.round(p.x), Math.round(p.y) + s, s, s);
        ctx.fillRect(Math.round(p.x) + s, Math.round(p.y) + s, s, s);
      } else if (p.kind === 'zzz') {
        ctx.font = `${s * 3}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText('z', Math.round(p.x), Math.round(p.y));
      } else if (p.kind === 'petal') {
        const rot = (p.life / p.maxLife) * Math.PI * 4;
        ctx.save();
        ctx.translate(Math.round(p.x), Math.round(p.y));
        ctx.rotate(rot);
        ctx.fillRect(0, 0, s, 1);
        ctx.fillRect(1, 1, s - 2, 1);
        ctx.restore();
      } else if (p.kind === 'puff') {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s + 1, s + 1);
      } else {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ===== MOOD PALETTE TINTING =====
  function hslToHex(h: number, s: number, l: number): string {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r: number, g: number, b: number;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  function hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
    return [h, s, l];
  }
  function tintPalette(pal: ReturnType<typeof getColors>, moodTint: { hueShift: number; satBoost: number; lightBoost: number }): typeof STAGE_COLORS[string] {
    const tintedBody = pal.body.map(hex => {
      const [h, s, l] = hexToHsl(hex);
      const nh = (h + moodTint.hueShift + 360) % 360;
      const ns = Math.min(1, s * moodTint.satBoost);
      const nl = Math.max(0, Math.min(1, l * moodTint.lightBoost));
      return hslToHex(nh, ns, nl);
    });
    const tintedEye = pal.eye.map(hex => {
      const [h, s, l] = hexToHsl(hex);
      const nh = (h + moodTint.hueShift + 360) % 360;
      const ns = Math.min(1, s * moodTint.satBoost);
      const nl = Math.max(0, Math.min(1, l * moodTint.lightBoost));
      return hslToHex(nh, ns, nl);
    });
    return { ...pal, body: tintedBody, eye: tintedEye } as typeof pal;
  }
  function getMoodTint(): { hueShift: number; satBoost: number; lightBoost: number } {
    switch (mood) {
      case 'happy': return { hueShift: 8, satBoost: 1.15, lightBoost: 1.05 };
      case 'excited': return { hueShift: 15, satBoost: 1.25, lightBoost: 1.08 };
      case 'sad': return { hueShift: -20, satBoost: 0.8, lightBoost: 0.9 };
      case 'angry': return { hueShift: -10, satBoost: 1.3, lightBoost: 0.95 };
      case 'frustrated': return { hueShift: -15, satBoost: 1.2, lightBoost: 0.92 };
      case 'sleepy': case 'tired': return { hueShift: -5, satBoost: 0.7, lightBoost: 0.95 };
      case 'proud': return { hueShift: 10, satBoost: 1.1, lightBoost: 1.06 };
      case 'focused': case 'thinking': return { hueShift: 5, satBoost: 0.95, lightBoost: 1.0 };
      default: return { hueShift: 0, satBoost: 1.0, lightBoost: 1.0 };
    }
  }

  // ===== SCANLINES OVERLAY =====
  function drawScanlines() {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#000000';
    for (let y = 0; y < height; y += 2) {
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }

  // ===== VIGNETTE =====
  function drawVignette() {
    ctx.save();
    const cx = width / 2, cy = height / 2;
    const inner = Math.max(1, Math.min(width, height) * 0.35);
    const outer = Math.max(inner + 1, Math.max(width, height) * 0.72);
    const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // ===== MOOD COLOR OVERLAY =====
  function drawMoodOverlay() {
    const moodColors: Record<string, string> = {
      happy: 'rgba(255,220,80,0.08)',
      excited: 'rgba(255,100,0,0.10)',
      proud: 'rgba(130,80,255,0.08)',
      focused: 'rgba(100,200,255,0.06)',
      thinking: 'rgba(180,180,255,0.05)',
      sad: 'rgba(80,140,255,0.12)',
      frustrated: 'rgba(180,90,90,0.10)',
      angry: 'rgba(220,60,60,0.14)',
      sleepy: 'rgba(120,120,180,0.08)',
      tired: 'rgba(100,100,140,0.10)',
      idle: 'rgba(255,255,255,0.02)',
    };
    const color = moodColors[mood];
    if (!color) return;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  let PARALLAX_STARS: Array<{x:number;y:number;phase:number;twinkle:number}> = [];
  const PARALLAX_STAR_COUNT = 24;
  $effect(() => {
    PARALLAX_STARS = [];
    for (let i = 0; i < PARALLAX_STAR_COUNT; i++) {
      PARALLAX_STARS.push({
        x: (i * 37) % (width - 10) + 5,
        y: (i * 53) % (Math.round(height * 0.5)) + 4,
        phase: (i * 0.7) % (Math.PI * 2),
        twinkle: 0.5 + Math.sin(i) * 0.5,
      });
    }
  });

  function drawParallaxStars(pal: ReturnType<typeof getColors>) {
    if (stage === 'egg') return;
    const drift = Math.sin(frame * 0.003) * 0.6;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = pal.body[6];
    for (const star of PARALLAX_STARS) {
      const bx = star.x + drift * (0.3 + (star.y / height) * 0.4);
      const by = star.y + Math.sin(frame * 0.002 + star.phase) * 0.3;
      const alpha = 0.1 + 0.15 * (0.5 + Math.sin(frame * 0.004 + star.phase) * 0.5);
      ctx.globalAlpha = alpha;
      ctx.fillRect(Math.round(bx), Math.round(by), 1, 1);
      ctx.fillRect(Math.round(bx + 1.5), Math.round(by), 1, 1);
      ctx.fillRect(Math.round(bx), Math.round(by + 1.5), 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ===== STAGE BACKGROUND PATTERN =====
  function drawBackground(visual: StageVisual, pal: ReturnType<typeof getColors>) {
    const pattern = visual.bgPattern;
    const t = frame * 0.02;
    drawParallaxStars(pal);
    ctx.save();
    ctx.globalAlpha = 0.18;

    if (pattern === 'dots') {
      for (let y = 4; y < height; y += 8) {
        for (let x = 4; x < width; x += 8) {
          ctx.fillStyle = pal.body[5];
          ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
        }
      }
    } else if (pattern === 'grass') {
      for (let x = 2; x < width; x += 6) {
        const sway = Math.sin(t + x * 0.1) * 1;
        const h = 3 + ((x * 3) % 4);
        ctx.fillStyle = pal.body[4];
        ctx.fillRect(Math.round(x + sway), height - 12 - h, 1, h);
        ctx.fillRect(Math.round(x + sway) + 2, height - 12 - h + 1, 1, h - 1);
      }
    } else if (pattern === 'waves') {
      for (let y = 8; y < height; y += 10) {
        for (let x = 6; x < width; x += 12) {
          ctx.fillStyle = pal.body[5];
          const wave = Math.sin(t + x * 0.08) * 2;
          ctx.fillRect(Math.round(x), Math.round(y + wave), 6, 2);
        }
      }
    } else if (pattern === 'mist') {
      for (let y = 20; y < height - 10; y += 14) {
        const drift = Math.sin(t * 0.5 + y * 0.05) * 4;
        const xStart = ((y * 2) % 20) - 10 + drift;
        for (let x = xStart; x < width; x += 30) {
          ctx.fillStyle = pal.body[6];
          ctx.fillRect(Math.round(x), Math.round(y), 18, 3);
        }
      }
    } else if (pattern === 'hearts') {
      for (let i = 0; i < visual.accentDots; i++) {
        const driftY = Math.sin(t + i) * 3;
        const hx = ((i * 37 + 13) % (width - 10)) + 5;
        const hy = (((i * 23 + 7) % (height - 20)) + 10) + driftY;
        ctx.fillStyle = pal.accent;
        ctx.fillRect(Math.round(hx), Math.round(hy), 2, 2);
        ctx.fillRect(Math.round(hx) + 2, Math.round(hy), 2, 2);
        ctx.fillRect(Math.round(hx), Math.round(hy) + 2, 2, 2);
        ctx.fillRect(Math.round(hx) + 2, Math.round(hy) + 2, 2, 2);
      }
    } else if (pattern === 'sun-rays') {
      const cx = Math.round(width / 2);
      const rot = Math.sin(t * 0.3) * 0.1;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + rot;
        ctx.fillStyle = pal.body[Math.min(6, pal.body.length - 1)];
        ctx.fillRect(cx, 4, 2, 10);
        ctx.fillRect(
          Math.round(cx + Math.cos(angle) * 6),
          Math.round(4 + Math.sin(angle) * 4),
          2, 8
        );
      }
    } else if (pattern === 'stars') {
      const flicker = 1 + Math.sin(t * 2) * 0.3;
      for (let i = 0; i < visual.accentDots; i++) {
        const sx = ((i * 41 + 19) % (width - 8)) + 4;
        const sy = ((i * 29 + 11) % ((height * 0.6) | 0)) + 4;
        const bright = (1 + ((i % 3) * 0.3)) * flicker;
        ctx.globalAlpha = Math.max(0.06, Math.min(0.35, 0.12 * bright));
        ctx.fillStyle = pal.accent;
        ctx.fillRect(Math.round(sx) - 1, Math.round(sy), 3, 1);
        ctx.fillRect(Math.round(sx), Math.round(sy) - 1, 1, 3);
      }
    } else if (pattern === 'aurora') {
      const shift = Math.sin(t * 0.4) * 2;
      for (let y = 6; y < height; y += 6) {
        ctx.fillStyle = pal.body[5 + ((y / 6) % 2)];
        ctx.fillRect(Math.round(shift), Math.round(y), width, 2);
      }
    }

    ctx.restore();
  }

  // ===== COLOR GRADING =====
  function getStageFilter(): string {
    switch (stage) {
      case 'egg': return 'contrast(1.05) brightness(1.02)';
      case 'hatchling': return 'contrast(1.08) brightness(1.04) saturate(1.1)';
      case 'baby': return 'contrast(1.1) brightness(1.05) saturate(1.15)';
      case 'child': return 'contrast(1.12) brightness(1.06) saturate(1.2)';
      case 'teen': return 'contrast(1.15) brightness(1.08) saturate(1.25)';
      case 'adult': return 'contrast(1.18) brightness(1.1) saturate(1.3)';
      case 'mega': return 'contrast(1.22) brightness(1.12) saturate(1.35)';
      default: return 'none';
    }
  }

  // ===== AMBIENT PARTICLES =====
  let ambientParticles: Array<{x:number;y:number;vx:number;vy:number;life:number;maxLife:number;color:string;size:number}> = [];
  const MAX_AMBIENT = 12;

  function spawnAmbient() {
    if (ambientParticles.length >= MAX_AMBIENT) return;
    const pal = getColors();
    ambientParticles.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.6 + height * 0.2,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -0.1 - Math.random() * 0.2,
      life: 0,
      maxLife: 120 + Math.random() * 80,
      color: pal.body[Math.floor(Math.random() * 2) + 5],
      size: 0.8 + Math.random() * 0.4,
    });
  }

  function updateAmbient() {
    for (let i = ambientParticles.length - 1; i >= 0; i--) {
      const p = ambientParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife || p.y < 0 || p.x < 0 || p.x > width) {
        ambientParticles[i] = ambientParticles[ambientParticles.length - 1];
        ambientParticles.pop();
      }
    }
    if (frame % 30 === 0 && ambientParticles.length < MAX_AMBIENT) spawnAmbient();
  }

  function drawAmbient() {
    ctx.save();
    for (const p of ambientParticles) {
      const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const s = Math.max(1, Math.round(p.size));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    ctx.restore();
  }

  // ===== MEGA-STAGE COSMIC RIM GLOW =====
  const COSMIC_ORBIT: Array<{x:number;y:number;angle:number;radius:number;color:string}> = [];
  const MEGA_ORBIT_COUNT = 6;
  const COSMIC_HUES = [45, 30, 50, 60, 40, 55];
  const COSMIC_SAT = 1.0;
  for (let i = 0; i < MEGA_ORBIT_COUNT; i++) {
    COSMIC_ORBIT.push({
      x: 0, y: 0,
      angle: (i / MEGA_ORBIT_COUNT) * Math.PI * 2,
      radius: 14 + i * 2,
      color: `#${hslToHex(COSMIC_HUES[i % COSMIC_HUES.length], COSMIC_SAT, 0.6)}`,
    });
  }

  function drawCosmicGlow() {
    if (stage !== 'mega') return;
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);
    const t = frame * 0.016;
    const pulse = 0.4 + 0.6 * (0.5 + Math.sin(t * 0.3) * 0.5);
    const pulseFast = 0.3 + 0.7 * (0.5 + Math.sin(t * 0.7) * 0.5);
    const auraRadius = Math.round(22 + pulse * 3);

    ctx.save();
    ctx.globalAlpha = 0.18 * pulse;

    ctx.filter = 'none';

    ctx.beginPath();
    ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraRadius);
    grad.addColorStop(0, `rgba(255,192,50,${0.5 * pulse})`);
    grad.addColorStop(0.3, `rgba(255,140,0,${0.35 * pulse})`);
    grad.addColorStop(0.5, `rgba(255,100,0,${0.2 * pulse})`);
    grad.addColorStop(0.7, `rgba(255,70,0,${0.12 * pulse})`);
    grad.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    for (let i = 0; i < COSMIC_ORBIT.length; i++) {
      const orb = COSMIC_ORBIT[i];
      orb.angle += 0.008 * pulse;
      orb.x = cx + Math.cos(orb.angle) * orb.radius;
      orb.y = cy + Math.sin(orb.angle) * orb.radius * 0.7;

      const starPulse = pulseFast * 0.6 + 0.4;
      ctx.globalAlpha = 0.6 * starPulse;
      ctx.fillStyle = orb.color;

      const ox = Math.round(orb.x);
      const oy = Math.round(orb.y);
      const s = 2;

      ctx.fillRect(ox, oy, s, s);
      ctx.fillRect(ox + s + 1, oy - 1, s, s);
      ctx.fillRect(ox - 1, oy + s + 1, s, s);
      ctx.fillRect(ox + s + 1, oy + s + 1, s, s);
      ctx.fillRect(ox - 1, oy - 1, s, s);
      ctx.fillRect(ox, oy + s + 2, 1, 1);
    }

    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.restore();
  }

  // ===== RENDER LOOP =====
   let currentPal: ReturnType<typeof getColors> | null = null;
   let lastMood = '';
   function render() {
     if (!ctx) return;
     const now = performance.now();
     const dt = Math.min(now - lastTime, 50);
     lastTime = now;
     frame++;

     const cx = Math.round(width / 2);
     const cy = Math.round(height / 2);

     const stageFilter = getStageFilter();
     ctx.filter = stageFilter;

     updateBlink(dt);
     updateParticles();
     updateAmbient();

     if (stage === 'mega') {
       const pal = getColors();
       if (frame % 20 === 0 && orbitParticles.length < MAX_ORBIT) {
         spawnOrbitParticle(cx, cy, [pal.accent, pal.body[6], pal.body[7]]);
       }
       updateOrbitParticles();
     }

     ctx.clearRect(0, 0, width, height);

     const visual = getVisual(stage);
    const framePal = currentPal || getColors();
    drawBackground(visual, framePal);

    const isSleeping = stage !== 'egg' &&
      (mood === 'sleepy' || mood === 'tired');
    if (isSleeping) {
      zPhase = (zPhase + dt * 0.001) % 1;
      if (frame % 30 === 0) {
        const pal = getColors();
        spawnParticle(
          16 + Math.random() * (width - 28),
          30 - Math.random() * 10,
          pal.body[4], 'zzz'
        );
      }
     } else {
       const pal = getColors();
      if (mood === 'happy' && frame % 12 === 0) {
        spawnParticle(cx - 10 + Math.random() * 20, height - 30, pal.accent, 'heart');
      }
      if (stage !== 'egg' && frame % 40 === 0) {
        spawnParticle(10 + Math.random() * (width - 20), 20 + Math.random() * (height - 40), pal.body[5], 'sparkle');
      }
      if ((stage === 'adult' || stage === 'mega') && frame % 18 === 0) {
        spawnParticle(Math.random() * width, 10 + Math.random() * (height * 0.4), pal.accent, 'sparkle');
      }
      if ((mood === 'happy' || mood === 'proud') && ['teen', 'adult', 'mega'].includes(stage) && frame % 25 === 0) {
        spawnParticle(cx - 8 + Math.random() * 16, height - 35, pal.accent, 'petal');
      }
      if (mood === 'excited' && frame % 8 === 0) {
        spawnParticle(cx - 6 + Math.random() * 12, height - 25, pal.body[6], 'puff');
      }
      if (stage === 'mega' && frame % 4 === 0) {
        const px2 = Math.max(3, Math.floor(Math.min(width, height) / 20));
        const crownY = Math.round(height / 2 - 4 * px2);
        const crownX = cx + (Math.random() - 0.5) * 6;
        const sparkleProb = Math.random();
        const sparkleColor = sparkleProb > 0.7 ? pal.accent : sparkleProb > 0.4 ? pal.body[6] : pal.body[7];
        spawnParticle(crownX, crownY, sparkleColor, 'sparkle');
      }
      if ((mood === 'happy' || mood === 'excited') && stage !== 'egg' && frame % 5 === 0) {
        const px2 = Math.max(3, Math.floor(Math.min(width, height) / 20));
        const groundY = Math.round(height / 2 + px2 * 6.5);
        const dir = facing === 'left' ? 1 : -1;
        const legX1 = cx - px2 * 1 + (-dir * px2 * 3);
        const legX2 = cx - px2 * 1 + (dir * px2 * 3);
        spawnParticle(legX1, groundY + 2, pal.body[1], 'puff');
        spawnParticle(legX2, groundY + 2, pal.body[1], 'puff');
      }
    }

    if (mood !== lastMood) {
      const basePal = getColors();
      currentPal = tintPalette(basePal, getMoodTint());
      lastMood = mood;
    }

     drawAmbient();
     drawParticles();

     if (stage === 'mega') {
       const pal = getColors();
       if (frame % 20 === 0 && orbitParticles.length < MAX_ORBIT) {
         spawnOrbitParticle(cx, cy, pal.accent ? [pal.accent, pal.body[6], pal.body[7]] : pal.body);
       }
       updateOrbitParticles();
     }

     const pose = animator.update(dt, mood, frame, isBlinking);
    const breathScale = 1 + Math.sin(frame * 0.04) * 0.02;

     let extraScale = breathScale;
     if (stage === 'mega') {
       const megaBreath = 1 + Math.sin(frame * 0.02) * 0.04;
       const megaPulse = 1 + Math.sin(frame * 0.015) * 0.03;
       extraScale *= megaBreath * megaPulse;
     }
    if (stage === 'egg') {
      const eggPulse = 1 + Math.sin(frame * 0.008) * 0.015;
      extraScale *= eggPulse;
    }

    drawSideView(pose, currentPal || getColors(), extraScale);

    if (stage === 'mega') {
      const pal = getColors();
      const shimmerAlpha = 0.08 + Math.sin(frame * 0.05) * 0.04;
      const cx = Math.round(width / 2);
      const cy = Math.round(height / 2);
      const px2 = Math.max(3, Math.floor(Math.min(width, height) / 20));
      const radius = px2 * 8;
      ctx.fillStyle = withAlpha(pal.accent, shimmerAlpha);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (['teen', 'adult', 'mega'].includes(stage) && stage !== 'egg' && pose.cyclePhase !== undefined) {
      const pal = getColors();
      const cx = Math.round(width / 2);
      const px2 = Math.max(3, Math.floor(Math.min(width, height) / 20));
      const groundY = Math.round(height / 2 + px2 * 6.5);
      const phase = pose.cyclePhase;

      const footX1 = cx - px2 * 3 + (pose.walkShift || 0) * px2 * 0.5;
      const footX2 = cx + px2 * 3 + (pose.walkShift || 0) * px2 * 0.5;

      if (Math.abs(Math.sin(phase)) > 0.95 && phase < Math.PI) {
        spawnParticle(Math.round(footX1), groundY + 2, pal.body[1], 'puff');
      }
      if (Math.abs(Math.sin(phase + Math.PI)) > 0.95 && phase >= Math.PI) {
        spawnParticle(Math.round(footX2), groundY + 2, pal.body[1], 'puff');
      }
    }

     drawOrbitParticles(Math.round(width / 2), Math.round(height / 2));

     drawCosmicGlow();

     if (speech) {
      drawSpeechBubble(speech, currentPal || getColors());
    }

    drawScanlines();
    drawVignette();
    drawMoodOverlay();

    ctx.filter = 'none';
    }

  function drawSpeechBubble(text: string, pal: ReturnType<typeof getColors> = getColors()) {
    const padX = 7, padY = 5;
    const px = Math.max(3, Math.floor(Math.min(width, height) / 20));
    const fontSize = Math.max(7, Math.min(width / (text.length + 5), 12));
    const charW = fontSize * 1.1;
    const maxW = width - 22;
    let bubbleW = Math.min(maxW, text.length * charW + padX * 2);
    const bubbleH = fontSize + padY * 2;
    const x = Math.round((width - bubbleW) / 2);
    const y = 3;

    ctx.save();

    ctx.fillStyle = pal.body[0];
    ctx.fillRect(x - 1, y - 1, bubbleW + 2, bubbleH + 2);

    ctx.fillStyle = pal.body[6];
    ctx.fillRect(x, y, bubbleW, bubbleH);

    ctx.fillStyle = pal.body[3];
    ctx.fillRect(x + 1, y + 1, bubbleW - 2, bubbleH - 2);

    ctx.fillStyle = pal.body[7];
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + bubbleW / 2, y + bubbleH / 2);

    ctx.fillStyle = pal.body[3];
    ctx.fillRect(x + bubbleW/2 - 3, y + bubbleH - 1, 6, 3);
    ctx.fillRect(x + bubbleW/2 - 2, y + bubbleH + 2, 4, 1);

    ctx.restore();
  }

  function updateBlink(dt: number) {
    blinkTimer += dt;
    if (!isBlinking && blinkTimer > 3000 + Math.random() * 4000) {
      isBlinking = true;
      blinkTimer = 0;
    }
    if (isBlinking && blinkTimer > 150) {
      isBlinking = false;
      blinkTimer = 0;
    }
  }

  $effect(() => {
    if (!speech) return;
    const interval = setInterval(() => {
      speechTimer -= 100;
      if (speechTimer <= 0) {
        speech = null;
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  });

  $effect(() => {
    if (externalSpeech && externalSpeech !== lastExternalSpeech) {
      say(externalSpeech, 6000);
      lastExternalSpeech = externalSpeech;
    }
  });

  $effect(() => { animator.setMood(mood as Mood); });
  $effect(() => {
    if (stage !== lastStage && lastStage !== '' && lastStage !== undefined) {
      showCutscene = true;
    }
    lastStage = stage;
  });

  function onCutsceneComplete() { showCutscene = false; }
  export function setStage(s: string) { stage = s; }
  export function setMood(m: Mood) { mood = m; }
  export function say(text: string, durationMs = 4000) {
    speech = text;
    speechTimer = durationMs;
  }
</script>

<div class="pixel-pet-container" style="width:{width}px; height:{height}px;">
  <canvas use:onCanvas class="pixel" style="image-rendering: pixelated; image-rendering: crisp-edges;"></canvas>
  {#if showCutscene}
    <EvolutionCutscene palette={getColors().body} {stage} onComplete={onCutsceneComplete} />
  {/if}
</div>

<style>
  .pixel-pet-container {
    position: relative;
    overflow: hidden;
    background: transparent;
  }
  canvas.pixel {
    display: block;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
