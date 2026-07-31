<script lang="ts">
  let { palette, stage, onComplete } = $props<{
    palette: string[];
    stage: string;
    onComplete: () => void;
  }>();

  let frame = 0;
  const TOTAL = 72;
  const W = 240;
  const H = 240;

  type Particle = {
    x: number; y: number;
    vx: number; vy: number;
    life: number; maxLife: number;
    color: string; size: number;
    kind: 'spark' | 'ring' | 'burst';
    trail?: { x: number; y: number }[];
  };
  const MAX_P = 120;
  let particles: Particle[] = [];

  function spawnParticle(x: number, y: number, color: string, kind: Particle['kind'] = 'spark') {
    if (particles.length >= MAX_P) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = kind === 'burst' ? 3 + Math.random() * 3 : kind === 'ring' ? 1.5 + Math.random() * 1.5 : 1.5 + Math.random() * 2.5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: kind === 'ring' ? 30 + Math.random() * 20 : 35 + Math.random() * 25,
      color,
      size: kind === 'ring' ? 1 : 1 + Math.random() * 1.5,
      kind,
      trail: [],
    });
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.trail && p.trail.length > 4) p.trail.shift();
      if (frame % 2 === 0) {
        if (!p.trail) p.trail = [];
        p.trail.push({ x: p.x, y: p.y });
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.kind === 'ring') { p.vx *= 0.94; p.vy *= 0.94; }
      else { p.vx *= 0.96; p.vy *= 0.96; }
      p.life++;
      if (p.life >= p.maxLife) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
      }
    }
  }

  function drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of particles) {
      const alpha = 1 - p.life / p.maxLife;
      const s = Math.max(1, Math.round(p.size));

      if (p.trail && p.trail.length > 1) {
        for (let ti = 0; ti < p.trail.length; ti++) {
          const tp = p.trail[ti];
          const ta = (ti / p.trail.length) * alpha * 0.3;
          ctx.globalAlpha = ta;
          ctx.fillStyle = p.color;
          const ts = Math.max(1, Math.round(s * 0.6));
          ctx.fillRect(Math.round(tp.x), Math.round(tp.y), ts, ts);
        }
      }

      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, outlineColor: string, fillColor: string) {
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = outlineColor;
    ctx.fillText(text, x - 1, y - 1);
    ctx.fillText(text, x + 1, y - 1);
    ctx.fillText(text, x - 1, y + 1);
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillText(text, x, y - 2);
    ctx.fillText(text, x, y + 2);
    ctx.fillText(text, x - 2, y);
    ctx.fillText(text, x + 2, y);

    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
  }

  function drawStageBadge(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, w: number, h: number, pal: string[]) {
    const outline = pal[0];
    const fill = pal[pal.length - 1];
    const mid = pal[Math.floor(pal.length / 2)];

    ctx.fillStyle = outline;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

    ctx.fillStyle = mid;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    ctx.fillStyle = outline;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  function flashScreen(ctx: CanvasRenderingContext2D, intensity: number) {
    if (intensity <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, intensity);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function onCanvas(el: HTMLCanvasElement) {
    const ctx = el.getContext('2d')!;
    const centerX = W / 2;
    const centerY = H / 2;
    const palBody = palette;

    const baseParticles: Particle[] = [];
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      baseParticles.push({
        x: centerX, y: centerY,
        vx: Math.cos(angle) * (2 + Math.random() * 2.5),
        vy: Math.sin(angle) * (2 + Math.random() * 2.5),
        life: 0,
        maxLife: 40 + Math.random() * 20,
        color: palBody[i % palBody.length],
        size: 1 + Math.random() * 1.5,
        kind: 'spark',
        trail: [],
      });
    }
    particles = baseParticles;

    let raf: number;
    let shockwaveR = 0;
    let shockwaveAlpha = 0;

    function tick() {
      const t = frame / TOTAL;
      ctx.clearRect(0, 0, W, H);

      if (frame < 8) {
        const shake = (8 - frame) * 1.2;
        const sx = (Math.random() - 0.5) * shake;
        const sy = (Math.random() - 0.5) * shake;
        ctx.save();
        ctx.translate(sx, sy);
      }

      if (frame < 12) {
        const flashT = frame / 12;
        flashScreen(ctx, 1 - flashT);
      }

      if (frame > 6 && frame < 36) {
        const spawnCount = frame < 18 ? 6 : 3;
        for (let i = 0; i < spawnCount; i++) {
          if (particles.length < MAX_P) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * 20;
            spawnParticle(
              centerX + Math.cos(angle) * dist,
              centerY + Math.sin(angle) * dist,
              palBody[Math.floor(Math.random() * palBody.length)],
              Math.random() > 0.7 ? 'ring' : 'spark'
            );
          }
        }
      }
      if (frame === 28) {
        for (let i = 0; i < 40; i++) {
          const angle = (i / 40) * Math.PI * 2;
          if (particles.length < MAX_P) {
            particles.push({
              x: centerX, y: centerY,
              vx: Math.cos(angle) * 5,
              vy: Math.sin(angle) * 5,
              life: 0,
              maxLife: 25,
              color: palBody[palBody.length - 1],
              size: 2,
              kind: 'burst',
              trail: [],
            });
          }
        }
      }

      updateParticles();
      drawParticles(ctx);

      if (frame >= 20 && frame < 40) {
        shockwaveR = (frame - 20) * 4;
        shockwaveAlpha = 1 - (frame - 20) / 20;
        ctx.save();
        ctx.globalAlpha = Math.max(0, shockwaveAlpha) * 0.5;
        ctx.strokeStyle = palBody[palBody.length - 1];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, shockwaveR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (stage === 'hatchling') {
        const crackT = Math.min(1, (frame - 4) / 20);
        if (frame > 4 && frame < 24) {
          ctx.save();
          ctx.strokeStyle = palBody[0];
          ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            const frac = crackT + (i / 4) * 0.1;
            const len = 18 + Math.sin(frame * 0.1 + i) * 2;
            ctx.globalAlpha = 0.7 * (1 - frac);
            const angle = (i * Math.PI * 0.4) + Math.sin(frame * 0.05) * 0.1;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
              centerX + Math.cos(angle) * len * frac,
              centerY + Math.sin(angle) * len * frac
            );
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      if (stage === 'adult' || stage === 'mega') {
        const shimmerFrame = (frame - 24) * 4;
        if (frame > 24 && frame < 38) {
          ctx.save();
          ctx.globalAlpha = 0.12 + Math.sin(shimmerFrame * 0.3) * 0.05;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
      }

      if (stage === 'mega') {
        const bloomT = Math.min(1, (frame - 30) / 20);
        if (frame > 30 && frame < 50) {
          ctx.save();
          const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30 + bloomT * 10);
          grad.addColorStop(0, `rgba(255,200,50,${0.3 * bloomT})`);
          grad.addColorStop(0.5, `rgba(255,100,0,${0.2 * bloomT})`);
          grad.addColorStop(1, 'rgba(255,40,0,0)');
          ctx.fillStyle = grad;
          ctx.globalAlpha = bloomT * 0.5;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
      }

      if (frame === 28) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      if (frame >= 46 && frame < 60) {
        const alpha = frame < 52 ? (frame - 46) / 6 : 1 - (frame - 52) / 8;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        drawPixelText(ctx, 'EVOLVED!', centerX, 38, 20, palBody[0], '#ffffff');
        drawStageBadge(ctx, stage.toUpperCase(), centerX - 40, H - 28, 80, 20, palBody);
        ctx.restore();
      }

      if (frame === 66) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      if (frame >= 8) {
        ctx.restore();
      }

      frame++;
      if (frame < TOTAL) {
        raf = requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    }

    raf = requestAnimationFrame(tick);
    return { destroy() { cancelAnimationFrame(raf); } };
  }
</script>

<canvas
  use:onCanvas
  width={W}
  height={H}
  style="position: absolute; top: 0; left: 0; width: 240px; height: 240px; pointer-events: none; image-rendering: pixelated; z-index: 100;"
></canvas>
