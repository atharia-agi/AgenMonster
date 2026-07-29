// WASM demo — browser-only pixel pet with canvas rendering.

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let frame = 0;
let stage = 'egg';
let energy = 1000;

const palettes: Record<string, string[]> = {
  egg: ['#0d1117', '#d2a8ff', '#58a6ff', '#e6edf3', '#484f58', '#f0e68c', '#ff6b6b'],
  hatchling: ['#0d1117', '#7ee787', '#58a6ff', '#e6edf3', '#484f58', '#ffd700', '#ff6b6b'],
  baby: ['#0d1117', '#ff9a9e', '#a18cd1', '#e6edf3', '#484f58', '#fad0c4', '#ff6b6b'],
  child: ['#0d1117', '#66d9ef', '#a6e22e', '#e6edf3', '#484f58', '#e6db74', '#ff6b6b'],
  teen: ['#0d1117', '#ae81ff', '#f92672', '#e6edf3', '#484f58', '#a6e22e', '#ff6b6b'],
  adult: ['#0d1117', '#e6db74', '#66d9ef', '#e6edf3', '#484f58', '#fd971f', '#ff6b6b'],
  mega: ['#0d1117', '#ffd700', '#00ffff', '#e6edf3', '#484f58', '#ff6b6b', '#ff00ff'],
};

function drawEgg(cx: number, cy: number, t: number) {
  const p = palettes[stage];
  const bobY = Math.sin(t) * 2;
  const y = cy + bobY;

  // Body
  ctx.fillStyle = p[1];
  for (let iy = -8; iy <= 8; iy++) {
    for (let ix = -5; ix <= 5; ix++) {
      if ((ix/5)*(ix/5) + (iy/8)*(iy/8) <= 1) {
        ctx.fillRect(cx + ix * 4, y + iy * 4, 4, 4);
      }
    }
  }

  // Highlight
  ctx.fillStyle = p[3];
  ctx.fillRect(cx - 8, y - 20, 4, 4);

  // Eyes
  const isBlinking = Math.sin(t * 0.5) > 0.95;
  if (!isBlinking) {
    ctx.fillStyle = p[3];
    ctx.fillRect(cx - 12, y - 4, 8, 8);
    ctx.fillRect(cx + 4, y - 4, 8, 8);
    ctx.fillStyle = p[0];
    ctx.fillRect(cx - 8, y - 0, 4, 4);
    ctx.fillRect(cx + 8, y - 0, 4, 4);
  } else {
    ctx.fillStyle = p[0];
    ctx.fillRect(cx - 12, y, 8, 2);
    ctx.fillRect(cx + 4, y, 8, 2);
  }
}

function render() {
  if (!ctx) return;
  const t = Date.now() / 1000;

  // Clear
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Pet
  drawEgg(canvas.width / 2, canvas.height / 2, t);

  // HUD
  ctx.fillStyle = '#484f58';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText(stage.toUpperCase(), 8, 20);
  ctx.fillText(`ENG: ${energy}/1000`, 8, 36);

  // Energy bar
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(8, 42, 120, 8);
  ctx.fillStyle = '#58a6ff';
  ctx.fillRect(8, 42, 120 * (energy / 1000), 8);

  frame++;
  requestAnimationFrame(render);
}

export function initWasmDemo() {
  canvas = document.getElementById('wasm-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Energy regen
  setInterval(() => {
    energy = Math.min(1000, energy + 1);
  }, 144000);

  // Stage cycling
  document.getElementById('evo-btn')?.addEventListener('click', () => {
    const stages = ['egg', 'hatchling', 'baby', 'child', 'teen', 'adult', 'mega'];
    const idx = stages.indexOf(stage);
    if (idx < stages.length - 1) {
      stage = stages[idx + 1];
      document.getElementById('stage-label')!.textContent = stage.toUpperCase();
    }
  });

  render();
}

// Auto-init
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initWasmDemo);
}
