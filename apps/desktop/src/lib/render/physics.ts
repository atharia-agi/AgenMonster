// Physics Systems - Spring and Cloth simulations
// Used by PixelPetV3 for secondary motion

// ============================================================
// SPRING SYSTEM
// ============================================================

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  restLength: number;
}

export interface SpringParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  targetX: number;
  targetY: number;
  mass: number;
  restLength: number;
}

export class SpringSystem {
  particles: { x: number; y: number; vx: number; vy: number; fx: number; fy: number; targetX: number; targetY: number; mass: number; restLength: number }[];
  stiffness: number;
  damping: number;
  gravity: number;

  constructor(count: number, config: { stiffness: number; damping: number; mass: number; restLength: number }) {
    this.stiffness = config.stiffness;
    this.damping = config.damping;
    this.gravity = 0;
    this.particles = Array.from({ length: count }, (_, i) => ({
      x: 0, y: 0,
      vx: 0, vy: 0,
      fx: 0, fy: 0,
      targetX: 0, targetY: 0,
      mass: config.mass,
      restLength: config.restLength / count
    }));
  }

  update(dt: number, baseX: number, baseY: number, targetOffsetX: number = 0, targetOffsetY: number = 0): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      const targetX = baseX + targetOffsetX + (i * 10);
      const targetY = baseY + targetOffsetY;
      const dx = targetX - p.x;
      const dy = targetY - p.y;
      
      p.fx = dx * this.stiffness - p.vx * this.damping;
      p.fy = dy * this.stiffness - p.vy * this.damping + this.gravity * p.mass;
      
      p.vx += p.fx / p.mass * 0.016;
      p.vy += p.fy / p.mass * 0.016;
      p.x += p.vx;
      p.y += p.vy;
      
      p.vx *= 0.99;
      p.vy *= 0.99;
    }
  }

  getPositions(): { x: number; y: number }[] {
    return this.particles.map(p => ({ x: p.x, y: p.y }));
  }
}

export class ClothSystem {
  particles: { x: number; y: number; px: number; py: number; vx: number; vy: number; pinned: boolean; mass: number }[];
  constraints: { a: number; b: number; restLength: number }[];
  width: number;
  height: number;
  spacing: number;
  stiffness: number;
  damping: number;
  gravity: number;
  windInfluence: number;

  constructor(config: { particleCount: number; stiffness: number; damping: number; gravity: number; windInfluence: number }) {
    this.particles = [];
    this.constraints = [];
    this.width = Math.sqrt(config.particleCount);
    this.height = Math.sqrt(config.particleCount);
    this.spacing = 8;
    this.stiffness = config.stiffness;
    this.damping = config.damping;
    this.gravity = config.gravity;
    this.windInfluence = config.windInfluence;
    
    this.particles = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.particles.push({
          x: x * this.spacing,
          y: y * this.spacing,
          vx: 0, vy: 0,
          px: x * this.spacing, py: y * this.spacing,
          pinned: y === 0,
          mass: 1
        });
      }

      this.constraints = [];
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const i = y * this.width + x;
          if (x < this.width - 1) {
            this.constraints.push({ a: i, b: i + 1, restLength: this.spacing });
          }
          if (y < this.height - 1) {
            this.constraints.push({ a: i, b: i + this.width, restLength: this.spacing });
          }
          if (x < this.width - 1 && y < this.height - 1) {
            this.constraints.push({ a: i, b: i + this.width + 1, restLength: this.spacing * 1.414 });
          }
          if (x > 0 && y < this.height - 1) {
            this.constraints.push({ a: i, b: i + this.width - 1, restLength: this.spacing * 1.414 });
          }
        }
      }
    }
  }

  update(dt: number, wind: { x: number; y: number }, gravity: number): void {
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      for (const p of this.particles) {
        if (p.pinned) continue;
        
        const vx = p.x - p.px;
        const vy = p.y - p.py;
        
        p.px = p.x;
        p.py = p.y;
        
        p.x += vx * 0.99 + 0 * subDt * subDt;
        p.y += vy * 0.99 + gravity * subDt * subDt;
        
        p.x += wind.x * 0.1 * subDt;
      }

      for (let iter = 0; iter < 4; iter++) {
        for (const c of this.constraints) {
          const pa = this.particles[c.a];
          const pb = this.particles[c.b];
          
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const diff = (c.restLength - dist) / dist * 0.5;
          
          if (!pa.pinned) {
            pa.x -= dx * diff * 0.5;
            pa.y -= dy * diff * 0.5;
          }
          if (!pb.pinned) {
            pb.x += dx * diff * 0.5;
            pb.y += dy * diff * 0.5;
          }
        }
      }

      for (const p of this.particles) {
        if (p.x < 0) p.x = 0;
        if (p.x > 200) p.x = 200;
        if (p.y < 0) p.y = 0;
        if (p.y > 150) p.y = 150;
      }
    }
  }

  getPositions(): { x: number; y: number; pinned: boolean }[] {
    return this.particles.map(p => ({ x: p.x, y: p.y, pinned: p.pinned }));
  }
}