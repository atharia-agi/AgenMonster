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
  let zPhase = 0;
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

  // ===== GBA 4-COLOR PALETTE =====
  // 0=darkest, 1=dark, 2=light, 3=lightest - colorful GBA vibe
  const STAGE_COLORS: Record<string, [string, string, string, string]> = {
    egg:      ['#604080', '#8060a0', '#c8a0d8', '#e0d0f0'],
    hatchling:['#106040', '#208860', '#50b8a0', '#80e8d0'],
    baby:     ['#106098', '#2878b8', '#60a8e8', '#a0d0ff'],
    child:    ['#483880', '#6850b0', '#a080e0', '#c8a8ff'],
    teen:     ['#881830', '#a83048', '#e8607c', '#ffa0b0'],
    adult:    ['#302070', '#503088', '#8060c0', '#b8a0e8'],
    mega:     ['#a06810', '#c08020', '#f0b040', '#ffe080'],
  };

  // ===== GBA PIXEL SPRITE =====
  // Soft thick outlines on every body part, colorful shading.

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
    const cx = Math.round(width / 2) + (facing === 'right' ? 2 * px : 0);
    const cy = Math.round(height / 2);

    const colors = getColors();
    const [darkest, dark, light, lightest] = colors;
    const outline = darken(light, 0.6);

    const p = (x: number, y: number) => facing === 'left' ? cx + x * px : cx - (x + 1) * px;
    const bodyBob = pose.bodyBob || 0;
    const headBob = pose.headBob || 0;
    const legSpread = pose.legSpread || 0;
    const showEye = pose.showEye !== false;
    const showMouth = pose.showMouth !== false;

    ctx.save();

    if (stage === 'egg') {
      ctx.fillStyle = outline;
      ctx.fillRect(Math.round(cx - 5 * px), Math.round(cy - 6 * px), 10 * px, 12 * px);
      ctx.fillStyle = lightest;
      ctx.fillRect(Math.round(cx - 4 * px), Math.round(cy - 5 * px), 8 * px, 10 * px);
      ctx.fillStyle = dark;
      ctx.fillRect(Math.round(cx - 2 * px), Math.round(cy - 1 * px), 4 * px, 2 * px);
    } else {
      const legY = cy + 4 * px + bodyBob * px;
      const legW = 2 * px;

      ctx.fillStyle = outline;
      ctx.fillRect(Math.round(p(2, 0) - 1), Math.round(legY - 1), legW + 2, 4 * px + 2);
      ctx.fillRect(Math.round(p(8, 0) - 1), Math.round(legY - 1), legW + 2, 4 * px + 2);
      ctx.fillStyle = dark;
      ctx.fillRect(Math.round(p(2, 0)), Math.round(legY), legW, 4 * px);
      ctx.fillRect(Math.round(p(8, 0)), Math.round(legY), legW, 4 * px);
      ctx.fillStyle = lightest;
      ctx.fillRect(Math.round(p(1, 3)), Math.round(legY + 3 * px), 3 * px, px);
      ctx.fillRect(Math.round(p(8, 3)), Math.round(legY + 3 * px), 3 * px, px);

      const bodyY = cy + bodyBob * px;
      ctx.fillStyle = outline;
      ctx.fillRect(Math.round(p(3, 2) - 1), Math.round(bodyY - 1), 6 * px + 2, 5 * px + 2);
      ctx.fillStyle = light;
      ctx.fillRect(Math.round(p(3, 2)), Math.round(bodyY), 6 * px, 5 * px);
      ctx.fillStyle = lightest;
      ctx.fillRect(Math.round(p(4, 2)), Math.round(bodyY), 3 * px, px);

      ctx.fillStyle = outline;
      ctx.fillRect(Math.round(p(1, -1) - 1), Math.round(bodyY - 2 * px - 1), 2 * px + 2, 2 * px + 2);
      ctx.fillStyle = light;
      ctx.fillRect(Math.round(p(1, -1)), Math.round(bodyY - 2 * px), 2 * px, 2 * px);

      ctx.fillStyle = outline;
      ctx.fillRect(Math.round(p(8, -1) - 1), Math.round(bodyY - 2 * px - 1), 2 * px + 2, 2 * px + 2);
      ctx.fillStyle = light;
      ctx.fillRect(Math.round(p(8, -1)), Math.round(bodyY - 2 * px), 2 * px, 2 * px);

      const headY = cy - 4 * px + headBob * px;
      ctx.fillStyle = outline;
      ctx.fillRect(Math.round(p(2, -3) - 1), Math.round(headY - 1), 6 * px + 2, 5 * px + 2);
      ctx.fillStyle = light;
      ctx.fillRect(Math.round(p(2, -3)), Math.round(headY), 6 * px, 5 * px);
      ctx.fillStyle = lightest;
      ctx.fillRect(Math.round(p(3, -3)), Math.round(headY), 3 * px, px);

      if (showEye) {
        ctx.fillStyle = outline;
        ctx.fillRect(Math.round(p(2, -2) - 1), Math.round(headY + px - 1), 2 * px + 2, 2 * px + 2);
        ctx.fillStyle = lightest;
        ctx.fillRect(Math.round(p(2, -2)), Math.round(headY + px), 2 * px, 2 * px);
        ctx.fillStyle = darkest;
        const pupilOffset = pose.eyeLook || 0;
        ctx.fillRect(Math.round(p(3, -2) + pupilOffset), Math.round(headY + px + px), px, px);
      } else {
        ctx.fillStyle = outline;
        ctx.fillRect(Math.round(p(2, -1)), Math.round(headY + 2 * px), 3 * px, px);
        ctx.fillStyle = darkest;
        ctx.fillRect(Math.round(p(2, -1) + 1), Math.round(headY + 2 * px + 1), 3 * px - 2, px - 2);
      }

      if (showMouth) {
        if (pose.mouthType === 'happy') {
          ctx.fillStyle = darkest;
          ctx.fillRect(Math.round(p(3, 0)), Math.round(headY + 3 * px), 2 * px, px);
        } else if (pose.mouthType === 'open') {
          ctx.fillStyle = darkest;
          ctx.fillRect(Math.round(p(3, 0)), Math.round(headY + 3 * px), px, px);
          ctx.fillRect(Math.round(p(4, 0)), Math.round(headY + 3 * px), px, px);
          ctx.fillStyle = lightest;
          ctx.fillRect(Math.round(p(3, 0) + 1), Math.round(headY + 3 * px + 1), px - 2, px - 2);
        } else if (pose.mouthType === 'sad') {
          ctx.fillStyle = darkest;
          ctx.fillRect(Math.round(p(3, 1)), Math.round(headY + 4 * px), 2 * px, px);
        } else {
          ctx.fillStyle = darkest;
          ctx.fillRect(Math.round(p(4, 0)), Math.round(headY + 3 * px), px, px);
        }
      }
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

    const isSleeping = stage !== 'egg' &&
      (mood === 'sleepy' || mood === 'tired');
    if (isSleeping) {
      zPhase = (zPhase + dt * 0.001) % 1;
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

    if (stage === 'mega' && frame % 8 === 0) {
      spawnParticle(20 + Math.random() * (width-40), 40 + Math.random() * (height-80), '#f0b040');
    } else if (stage === 'adult' && frame % 12 === 0) {
      spawnParticle(20 + Math.random() * (width-40), height-40, '#8060c0');
    }

    drawParticles();

    const pose = animator.update(16, mood, frame, isBlinking);
    drawSideView(pose);

    if (speech) {
      drawSpeechBubble(speech);
    }
  }

  function drawZ(x: number, y: number, size: number, text: string, color: string) {
    ctx.fillStyle = color;
    ctx.font = `${size * 4}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const tx = x + size * 2;
    const ty = y + size * 2;
    ctx.fillText(text, tx + 1, ty);
    ctx.fillText(text, tx - 1, ty);
    ctx.fillText(text, tx, ty + 1);
    ctx.fillText(text, tx, ty - 1);
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

    const colors = getColors();
    ctx.fillStyle = colors[3];
    ctx.fillRect(x - 2, y - 2, bubbleW + 4, bubbleH + 4);
    ctx.fillStyle = colors[1];
    ctx.fillRect(x, y, bubbleW, bubbleH);

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
