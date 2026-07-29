<script lang="ts">
  let { palette, stage, onComplete } = $props<{
    palette: string[];
    stage: string;
    onComplete: () => void;
  }>();

  let frame = 0;
  const TOTAL = 48;

  function initParticles() {
    const particles: {x:number;y:number;vx:number;vy:number;life:number;color:string;size:number}[] = [];
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      particles.push({
        x: 120, y: 120,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3),
        life: 1.0,
        color: palette[i % palette.length],
        size: 2 + Math.floor(Math.random() * 2),
      });
    }
    return particles;
  }

  function onCanvas(el: HTMLCanvasElement) {
    const ctx = el.getContext('2d')!;
    const particles = initParticles();
    let raf: number;

    function tick() {
      const t = frame / TOTAL;
      ctx.clearRect(0, 0, 240, 240);

      const overlayAlpha = t < 0.3 ? t / 0.3 * 0.7 : 0.7 * (1 - (t - 0.3) / 0.7);
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0, overlayAlpha)})`;
      ctx.fillRect(0, 0, 240, 240);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life > 0) {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;

      if (t > 0.7 && t < 0.95) {
        ctx.font = '16px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('EVOLVED!', 120, 40);
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
  width={240}
  height={240}
  style="position: absolute; top: 0; left: 0; width: 240px; height: 240px; pointer-events: none; image-rendering: pixelated; z-index: 100;"
></canvas>
