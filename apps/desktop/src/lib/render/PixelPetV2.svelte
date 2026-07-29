<script lang="ts">
  import { SpriteAnimator, type SpritePose } from './animator';
  import EvolutionCutscene from './EvolutionCutscene.svelte';

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
  let zPhase = 0;       // Z animation when sleeping
  let lastExternalSpeech = '';

  function onCanvas(el: HTMLCanvasElement) {
    canvas = el;
    el.width = width;
    el.height = height;
    ctx = el.getContext('2d')!;
    ready = true;
    function loop() {
      try { render(); } catch(e) { console.error('PixelPet render error', e); }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return { destroy() { cancelAnimationFrame(raf); } };
  }

  const animator = new SpriteAnimator();

  // ===== GAME BOY 4-COLOR PALETTE =====
  // 0=transparent, 1=darkest #0f380f, 2=dark #306230, 3=light #8bac0f, 4=lightest #9bbc0f
  const STAGE_COLORS: Record<string, [string, string, string, string]> = {
    egg:      ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    hatchling:['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    baby:     ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    child:    ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    teen:     ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    adult:    ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    mega:     ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  };

  // ===== NEO-POP PIXEL SPRITE =====
  // Thick 3px outlines on every body part, vectorized shading.

  function getColors() {
    return STAGE_COLORS[stage] || STAGE_COLORS.egg;
  }

  function darken(hex: string, factor = 0.85) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
    return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
  }

  function fillBordered(x: number, y: number, w: number, h: number, color: string, outline: string) {
    const ow = w + 4;
    const oh = h + 4;
    ctx.fillStyle = outline;
    ctx.fillRect(Math.round(x - 2), Math.round(y - 2), ow, oh);
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  function drawSideView(pose: SpritePose) {
    const px = Math.max(3, Math.floor(Math.min(width, height) / 20));
    const spriteW = 16 * px;
    const spriteH = 16 * px;
    const cx = Math.round((width - spriteW) / 2) + (facing === 'right' ? spriteW : 0);
    const cy = Math.round((height - spriteH) / 2);

    const colors = getColors();
    const [darkest, dark, light, lightest] = colors;

    const p = (x: number, y: number) => facing === 'left' ? cx + x * px : cx - (x + 1) * px;
    const bodyBob = pose.bodyBob || 0;
    const headBob = pose.headBob || 0;
    const legSpread = pose.legSpread || 0;
    const showEye = pose.showEye !== false;
    const showMouth = pose.showMouth !== false;

    ctx.save();

    // === TAIL (back layer) ===
    if (stage !== 'egg') {
      const tailY = cy + (10 + bodyBob) * px;
      const tx = facing === 'left' ? cx + 11 * px : cx - 12 * px;
      const TW = 3 * px, TH = px;
      const THROW = TH + 4;
      ctx.fillStyle = darkest;
      ctx.fillRect(Math.round(tx - 2), Math.round(tailY - 2), TW + 4, THROW);
      ctx.fillStyle = dark;
      ctx.fillRect(Math.round(tx), Math.round(tailY), TW, px);
      ctx.fillRect(Math.round(tx + px), Math.round(tailY - px), px, px);
    }

    // === LEGS ===
    const flX = p(3 + legSpread, 0);
    fillBordered(flX - 2, cy + (13 + bodyBob) * px - 2, 2 * px + 4, px + 4, dark, darkest);
    ctx.fillStyle = darken(dark, 0.7);
    ctx.fillRect(Math.round(flX), Math.round(cy + (14 + bodyBob) * px), 2 * px, 2 * px);
    ctx.fillStyle = lightest;
    ctx.fillRect(Math.round(flX - px), Math.round(cy + (16 + bodyBob) * px), 3 * px, px);

    const blX = p(9 - legSpread, 0);
    fillBordered(blX - 2, cy + (13 + bodyBob) * px - 2, 2 * px + 4, px + 4, dark, darkest);
    ctx.fillStyle = darken(dark, 0.75);
    ctx.fillRect(Math.round(blX), Math.round(cy + (14 + bodyBob) * px), 2 * px, 2 * px);
    ctx.fillStyle = light;
    ctx.fillRect(Math.round(blX - px), Math.round(cy + (16 + bodyBob) * px), 3 * px, px);

    // === BODY ===
    const by = cy + (6 + bodyBob) * px;
    fillBordered(p(3, 6) - 2, by - 2, 7 * px + 4, 6 * px + 4, light, darkest);
    ctx.fillStyle = light;
    ctx.fillRect(Math.round(p(4, 8)), Math.round(by + 2 * px), 5 * px, 3 * px);
    ctx.fillStyle = lightest;
    ctx.fillRect(Math.round(p(4, 7)), Math.round(by), 3 * px, px);

    // === HEAD ===
    const hy = cy + headBob * px;
    fillBordered(p(0, 1) - 2, hy - 2, 7 * px + 4, 6 * px + 4, light, darkest);
    ctx.fillStyle = lightest;
    ctx.fillRect(Math.round(p(1, 1)), Math.round(hy), 3 * px, px);
    ctx.fillStyle = light;
    ctx.fillRect(Math.round(p(1, 5)), Math.round(hy + 4 * px), 3 * px, px);

    // === EYES ===
    if (showEye) {
      fillBordered(p(1, 2) - 2, hy + px - 2, 2 * px + 4, 2 * px + 4, lightest, darkest);
      ctx.fillStyle = darkest;
      const pupilOffset = pose.eyeLook || 0;
      ctx.fillRect(Math.round(p(2 + pupilOffset, 2)), Math.round(hy + px + px), px, px);
      ctx.fillStyle = lightest;
      ctx.fillRect(Math.round(p(2, 2)), Math.round(hy + px), px, px);
    } else {
      ctx.fillStyle = darkest;
      ctx.fillRect(Math.round(p(1, 3)), Math.round(hy + 2 * px), 2 * px, px);
    }

    // === MOUTH ===
    if (showMouth) {
      if (pose.mouthType === 'happy') {
        ctx.fillStyle = darkest;
        ctx.fillRect(Math.round(p(1, 4)), Math.round(hy + 3 * px), 2 * px, px);
      } else if (pose.mouthType === 'open') {
        ctx.fillStyle = darkest;
        ctx.fillRect(Math.round(p(1, 4)), Math.round(hy + 3 * px), px, px);
        ctx.fillRect(Math.round(p(2, 4)), Math.round(hy + 3 * px), px, px);
        ctx.fillStyle = lightest;
        ctx.fillRect(Math.round(p(2, 4)), Math.round(hy + 3 * px), px, px);
      } else if (pose.mouthType === 'sad') {
        ctx.fillStyle = darkest;
        ctx.fillRect(Math.round(p(2, 5)), Math.round(hy + 4 * px), 2 * px, px);
      } else {
        ctx.fillStyle = darkest;
        ctx.fillRect(Math.round(p(2, 4)), Math.round(hy + 3 * px), px, px);
      }
    }

    // === EARS / HORNS ===
    if (stage !== 'egg') {
      const earX = p(0, 0);
      const earY = hy;
      ctx.fillStyle = darkest;
      ctx.fillRect(Math.round(earX - 2), Math.round(earY - 2), 2 * px + 4, px + 4);
      ctx.fillStyle = dark;
      ctx.fillRect(Math.round(earX), Math.round(earY), 2 * px, px);
      ctx.fillRect(Math.round(earX), Math.round(earY + px), px, px);
    }

    // === ARMS ===
    if (stage !== 'egg') {
      ctx.fillStyle = darkest;
      ctx.fillRect(Math.round(p(-1, 7)) - 2, Math.round(cy + (7 + bodyBob) * px) - 2, px + 4, 2 * px + 4);
      ctx.fillStyle = dark;
      ctx.fillRect(Math.round(p(-1, 7)), Math.round(cy + (7 + bodyBob) * px), px, 2 * px);

      ctx.fillRect(Math.round(p(11, 7)) - 2, Math.round(cy + (7 + bodyBob) * px) - 2, px + 4, px + 4);
      ctx.fillRect(Math.round(p(11, 7)), Math.round(cy + (7 + bodyBob) * px), px, px);
    }

    ctx.restore();
  }

  // ===== PARTICLES =====
  interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    life: number; maxLife: number;
    color: string; size: number;
  }
  let particles: Particle[] = [];

  function spawnParticle(x: number, y: number, color: string) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.8 - 0.2,
      life: 0, maxLife: 30 + Math.random() * 30,
      color, size: 1 + Math.random(),
    });
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = p.color;
      const px = Math.max(1, Math.round(p.size));
      ctx.fillRect(Math.round(p.x), Math.round(p.y), px, px);
    }
    ctx.globalAlpha = 1;
  }

  // ===== RENDER LOOP =====
  function render() {
    if (!ctx) return;
    const now = performance.now();
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    frame++;

    updateBlink(dt);
    updateParticles();

    ctx.clearRect(0, 0, width, height);

    // ENHANCED: Sleep Z-particles drift up from monster's head
    const isSleeping = stage !== 'egg' &&
      (mood === 'sleepy' || mood === 'tired');
    if (isSleeping) {
      zPhase = (zPhase + dt * 0.001) % 1;
      // Spawn one Z every ~24 frames when sleeping
      if (frame % 24 === 0) {
        const colors = getColors();
        const zPoints = [
          { o: 0, s: 4,  text: 'z', color: colors[2] },
          { o: 0.3, s: 6,  text: 'z', color: colors[1] },
          { o: 0.6, s: 8,  text: 'Z', color: colors[0] },
        ];
        for (let i = 0; i < zPoints.length; i++) {
          const z = zPoints[i];
          const phase = (zPhase + z.o) % 1;
          const zx = 14 + phase * (width - 24);
          const zy = 30 - phase * 26;
          drawZ(zx, zy, z.s, z.text, z.color);
        }
      }
    }

    // Background particles
    if (stage === 'mega' && frame % 8 === 0) {
      spawnParticle(20 + Math.random() * (width-40), 40 + Math.random() * (height-80), '#ffc860');
    } else if (stage === 'adult' && frame % 12 === 0) {
      spawnParticle(20 + Math.random() * (width-40), height-40, '#8070c0');
    }

    drawParticles();

    const pose = animator.update(16, mood, frame, isBlinking);
    drawSideView(pose);

    // ENHANCED: draw floating speech bubble if speech is set
    if (speech) {
      drawSpeechBubble(speech);
    }
  }

  function drawZ(x: number, y: number, size: number, text: string, color: string) {
    ctx.fillStyle = color;
    ctx.font = `${size * 4}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    // Draw with a thick outline for visibility
    const tx = x + size * 2;
    const ty = y + size * 2;
    ctx.fillText(text, tx + 1, ty);
    ctx.fillText(text, tx - 1, ty);
    ctx.fillText(text, tx, ty + 1);
    ctx.fillText(text, tx, ty - 1);
    // Solid color on top — but flip to bg color if dark
    const colors = getColors();
    ctx.fillStyle = colors[3];
    ctx.fillText(text, tx, ty);
  }

  function drawSpeechBubble(text: string) {
    const padX = 6, padY = 4;
    const px = Math.max(3, Math.floor(Math.min(width, height) / 20));
    const fontSize = Math.max(6, Math.min(width / (text.length + 4), 11));
    const charW = fontSize * 1.05;
    const bubbleW = Math.min(width - 16, text.length * charW + padX * 2);
    const bubbleH = fontSize + padY * 2;
    const x = Math.round((width - bubbleW) / 2);
    const y = 2;

    // Box with thick border
    const colors = getColors();
    ctx.fillStyle = colors[3];
    ctx.fillRect(x - 2, y - 2, bubbleW + 4, bubbleH + 4);
    ctx.fillStyle = colors[1];
    ctx.fillRect(x, y, bubbleW, bubbleH);

    // Text
    ctx.fillStyle = colors[0];
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + bubbleW / 2, y + bubbleH / 2);
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

  // ENHANCED: speech timer countdown
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

  // ENHANCED: react to external speech prop changes
  $effect(() => {
    if (externalSpeech && externalSpeech !== lastExternalSpeech) {
      say(externalSpeech, 6000);
      lastExternalSpeech = externalSpeech;
    }
  });

  $effect(() => { animator.setMood(mood as any); });
  $effect(() => {
    if (stage !== lastStage && lastStage !== '' && lastStage !== undefined) {
      showCutscene = true;
    }
    lastStage = stage;
  });

  function onCutsceneComplete() { showCutscene = false; }
  export function setStage(s: string) { stage = s; }
  export function setMood(m: string) { mood = m; }
  export function say(text: string, durationMs = 4000) {
    speech = text;
    speechTimer = durationMs;
  }
</script>

<div class="pixel-pet-container" style="width:{width}px; height:{height}px;">
  <canvas use:onCanvas class="pixel" style="image-rendering: pixelated; image-rendering: crisp-edges;"></canvas>
  {#if showCutscene}
    <EvolutionCutscene palette={getColors()} {stage} onComplete={onCutsceneComplete} />
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
