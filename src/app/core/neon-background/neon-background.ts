import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { ThemeService } from '../theme.service';
import { GridFxService } from '../grid-fx.service';
import { AmbientAudioService } from '../ambient-audio.service';

interface Tracer {
  x: number;
  z: number;
  dx: number;
  dz: number;
  speed: number;
  color: string;
  nextTurnIn: number;
  /** true pour les renforts temporaires déclenchés par le terminal */
  ephemeral: boolean;
  ttl: number;
  /** Coins du mur de lumière — uniquement les virages, jamais de courbe. */
  corners: { x: number; z: number }[];
  /** Longueur maximale du mur en unités monde. */
  maxLen: number;
  /** Territoire exclusif de la moto — les murs ne se croisent jamais. */
  bounds: { x1: number; x2: number; z1: number; z2: number };
}

interface Star {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
}

const CYAN = '#00e5ff';
const ORANGE = '#ff9b2f';

// Icosaèdre unitaire : 12 sommets sur le nombre d'or, arêtes déduites par
// distance (les paires adjacentes sont exactement à 2 — vraie 3D, zéro lib).
const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_VERTS: readonly (readonly [number, number, number])[] = [
  [-1, PHI, 0],
  [1, PHI, 0],
  [-1, -PHI, 0],
  [1, -PHI, 0],
  [0, -1, PHI],
  [0, 1, PHI],
  [0, -1, -PHI],
  [0, 1, -PHI],
  [PHI, 0, -1],
  [PHI, 0, 1],
  [-PHI, 0, -1],
  [-PHI, 0, 1],
];
const ICO_EDGES: [number, number][] = [];
for (let i = 0; i < ICO_VERTS.length; i++) {
  for (let j = i + 1; j < ICO_VERTS.length; j++) {
    const [ax, ay, az] = ICO_VERTS[i];
    const [bx, by, bz] = ICO_VERTS[j];
    if ((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2 < 5) {
      ICO_EDGES.push([i, j]);
    }
  }
}
/** Rayon des sommets de l'icosaèdre (≈ 1,902). */
const ICO_RADIUS = Math.hypot(1, PHI);

const GRID_SPACING = 4;
const NEAR = 1.4;
const FAR = 120;
const BOUND_X = 70;
const FOCAL = 320;
const CAM_HEIGHT = 5;
const BASE_CYCLES = 6;

/**
 * Fond animé plein écran : grille en perspective qui défile, horizon
 * lumineux, ciel étoilé et traceurs laissant des traînées néon.
 * Rendu Canvas 2D en mode additif — aucun asset, aucune dépendance.
 */
@Component({
  selector: 'app-neon-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas aria-hidden="true"></canvas>`,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: -1;
      display: block;
      background:
        radial-gradient(ellipse 120% 60% at 50% 34%, rgba(10, 30, 55, 0.55), transparent 70%),
        var(--bg);
    }

    canvas {
      width: 100%;
      height: 100%;
    }
  `,
})
export class NeonBackground {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly theme = inject(ThemeService);
  private readonly fx = inject(GridFxService);
  private readonly audio = inject(AmbientAudioService);
  private readonly destroyRef = inject(DestroyRef);

  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private horizonY = 0;

  private accent = CYAN;
  private rival = ORANGE;
  private scroll = 0;
  /** Dégradé de brume mis en cache — recalculé au resize seulement. */
  private fogGradient?: CanvasGradient;
  private cycles: Tracer[] = [];
  private stars: Star[] = [];
  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private reducedMotion = false;
  /** Plafond de rendu : 60 fps (un fond d'ambiance n'a pas besoin de 144),
   *  20 fps quand la fenêtre perd le focus. */
  private minFrameMs = 1000 / 60;
  /** Énergie du synthé, lissée — 0 quand la musique est coupée. */
  private audioLevel = 0;
  /** Flash du kick (déjà une enveloppe côté moteur) — lu tel quel. */
  private audioPulse = 0;
  /** Angle de lacet de l'icosaèdre — le kick lui donne une impulsion. */
  private meshAngle = 0;

  // Le curseur allume les dalles de la grille : l'écouteur ne fait que
  // mémoriser la position, l'échantillonnage vit dans la boucle (60 fps).
  private mouseX = 0;
  private mouseY = 0;
  private litTiles = new Map<string, { xi: number; zi: number; t: number }>();
  /** Défilement cumulé (jamais replié) — ancre stable des indices de dalles. */
  private scrollTotal = 0;

  constructor() {
    effect(() => {
      const accent = this.theme.accent();
      this.accent = accent === 'cyan' ? CYAN : ORANGE;
      this.rival = accent === 'cyan' ? ORANGE : CYAN;
      for (const [i, cycle] of this.cycles.entries()) {
        cycle.color = i % 3 === 2 ? this.rival : this.accent;
      }
    });

    effect(() => {
      if (this.fx.burst() > 0) {
        untracked(() => this.spawnBurst());
      }
    });

    afterNextRender(() => this.start());
  }

  private start(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    this.ctx = ctx;

    this.reducedMotion =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      // Plafonné à 1,5 : sur un écran dense, le rendu additif plein écran
      // coûte cher et la différence visuelle est imperceptible sur du glow.
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.horizonY = this.height * 0.36;
      canvas.width = Math.round(this.width * this.dpr);
      canvas.height = Math.round(this.height * this.dpr);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const fog = ctx.createLinearGradient(0, this.horizonY, 0, this.height);
      fog.addColorStop(0, 'rgba(2, 4, 9, 0)');
      fog.addColorStop(1, 'rgba(2, 4, 9, 0.92)');
      this.fogGradient = fog;
      this.seedStars();
      if (this.reducedMotion) {
        this.drawFrame(0);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    this.destroyRef.onDestroy(() => window.removeEventListener('resize', resize));

    // Sur mobile, trois traceurs suffisent — répartis en diagonale sur la
    // grille des secteurs (batterie et GPU modestes obligent).
    const count = this.width < 768 ? 3 : BASE_CYCLES;
    const spread = [0, 4, 2];
    for (let i = 0; i < count; i++) {
      this.cycles.push(this.createCycle(i % 3 === 2, false, count === 3 ? spread[i] : i));
    }

    if (this.reducedMotion) {
      this.drawFrame(0);
      return;
    }

    const onVisibility = () => {
      if (document.hidden) {
        this.stopLoop();
      } else {
        this.startLoop();
      }
    };
    const onFocusChange = () => {
      this.minFrameMs = document.hasFocus() ? 1000 / 60 : 1000 / 20;
    };
    // Sillage de souris : pointeurs fins uniquement (rien à tracer au doigt).
    if (matchMedia('(pointer: fine)').matches) {
      const onMove = (e: PointerEvent) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
      };
      window.addEventListener('pointermove', onMove, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('pointermove', onMove));
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocusChange);
    window.addEventListener('blur', onFocusChange);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocusChange);
      window.removeEventListener('blur', onFocusChange);
      this.stopLoop();
    });

    this.startLoop();
  }

  private startLoop(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastTime = performance.now();
    const frame = (now: number) => {
      if (!this.running) {
        return;
      }
      this.rafId = requestAnimationFrame(frame);
      // Saute les frames au-delà du plafond — la boucle reste programmée.
      if (now - this.lastTime < this.minFrameMs) {
        return;
      }
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.update(dt, now / 1000);
      this.drawFrame(now / 1000);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  private stopLoop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /* --- Simulation --------------------------------------------------------- */

  /** Secteur d'une grille 3×2 avec marge — un territoire par moto. */
  private sectorFor(index: number): Tracer['bounds'] {
    const COLS = 3;
    const ROWS = 2;
    const PAD = 3;
    const col = index % COLS;
    const row = Math.floor(index / COLS) % ROWS;
    const zMin = NEAR + 2;
    const w = (BOUND_X * 2) / COLS;
    const h = (FAR * 0.72 - zMin) / ROWS;
    return {
      x1: -BOUND_X + col * w + PAD,
      x2: -BOUND_X + (col + 1) * w - PAD,
      z1: zMin + row * h + PAD,
      z2: zMin + (row + 1) * h - PAD,
    };
  }

  private createCycle(rival: boolean, ephemeral = false, sector = 0): Tracer {
    const dirs = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 0, dz: -1 },
    ];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const bounds = this.sectorFor(sector);
    const x = bounds.x1 + Math.random() * (bounds.x2 - bounds.x1);
    const z = bounds.z1 + Math.random() * (bounds.z2 - bounds.z1);
    return {
      x,
      z,
      dx: dir.dx,
      dz: dir.dz,
      speed: 9 + Math.random() * 9,
      color: rival ? this.rival : this.accent,
      nextTurnIn: 1 + Math.random() * 3,
      ephemeral,
      ttl: ephemeral ? 7 + Math.random() * 4 : Infinity,
      corners: [{ x, z }],
      maxLen: 30 + Math.random() * 20,
      bounds,
    };
  }

  private spawnBurst(): void {
    // Un renfort par secteur — l'overdrive reste rangé (et sobre sur mobile).
    const count = this.width < 768 ? 3 : 6;
    for (let i = 0; i < count; i++) {
      this.cycles.push(this.createCycle(i % 2 === 0, true, count === 3 ? i * 2 : i));
    }
  }

  private update(dt: number, time: number): void {
    this.sampleMouse(time);
    // La grille écoute le synthé : l'énergie lissée porte la vitesse de
    // croisière, le flash du kick donne la surtension sur chaque temps.
    // Seuls l'icosaèdre et le trait d'horizon écoutent la musique — le
    // reste de la grille garde son calme d'origine.
    const target = this.audio.level();
    this.audioLevel += (target - this.audioLevel) * Math.min(1, dt * 8);
    this.audioPulse = this.audio.pulse();
    this.scrollTotal += dt * 3.2;
    this.scroll = this.scrollTotal % GRID_SPACING;
    this.meshAngle += dt * (0.3 + 0.25 * this.audioLevel + 0.9 * this.audioPulse);

    for (const cycle of this.cycles) {
      cycle.x += cycle.dx * cycle.speed * dt;
      cycle.z += cycle.dz * cycle.speed * dt;
      cycle.ttl -= dt;
      cycle.nextTurnIn -= dt;

      const { x1, x2, z1, z2 } = cycle.bounds;
      const outOfBounds = cycle.x < x1 || cycle.x > x2 || cycle.z < z1 || cycle.z > z2;
      if (cycle.nextTurnIn <= 0 || outOfBounds) {
        this.turn(cycle);
        cycle.nextTurnIn = 2 + Math.random() * 4;
      }
      this.trimWall(cycle);
    }

    this.cycles = this.cycles.filter((c) => c.ttl > 0 || !c.ephemeral);
  }

  /**
   * Projette le curseur sur le sol (inverse de project()) et allume la dalle
   * de grille survolée. Le sol défile : les dalles glissent et s'éteignent
   * en fondu derrière — un sillage quantifié sur la grille, jamais un
   * gribouillis. Borné : 24 dalles, fondu 0,9 s.
   */
  private sampleMouse(time: number): void {
    const dy = this.mouseY - this.horizonY;
    if (dy > 6) {
      const z = (CAM_HEIGHT * FOCAL) / dy;
      if (z >= NEAR + 0.5 && z <= FAR * 0.7) {
        const x = ((this.mouseX - this.width / 2) * z) / FOCAL;
        const xi = Math.floor(x / GRID_SPACING);
        const zi = Math.floor((z - NEAR + this.scrollTotal) / GRID_SPACING);
        if (Math.abs(xi) <= 26) {
          const key = xi + '|' + zi;
          const lit = this.litTiles.get(key);
          if (lit) {
            lit.t = time;
          } else {
            this.litTiles.set(key, { xi, zi, t: time });
          }
        }
      }
    }
    for (const [key, tile] of this.litTiles) {
      if (time - tile.t > 0.9) {
        this.litTiles.delete(key);
      }
    }
    while (this.litTiles.size > 24) {
      this.litTiles.delete(this.litTiles.keys().next().value as string);
    }
  }

  private turn(cycle: Tracer): void {
    // Virage à 90° : le point de pivot devient un coin du mur de lumière.
    const { x1, x2, z1, z2 } = cycle.bounds;
    cycle.x = Math.max(x1, Math.min(x2, cycle.x));
    cycle.z = Math.max(z1, Math.min(z2, cycle.z));
    cycle.corners.push({ x: cycle.x, z: cycle.z });

    // Nouvelle direction orientée vers le cœur du territoire.
    if (cycle.dx !== 0) {
      cycle.dz = cycle.z > (z1 + z2) / 2 ? -1 : 1;
      if (Math.random() < 0.45) {
        cycle.dz *= -1;
      }
      cycle.dx = 0;
    } else {
      cycle.dx = cycle.x > (x1 + x2) / 2 ? -1 : 1;
      if (Math.random() < 0.45) {
        cycle.dx *= -1;
      }
      cycle.dz = 0;
    }
  }

  /** Rogne la queue du mur pour qu'il garde une longueur constante. */
  private trimWall(cycle: Tracer): void {
    const pts = [...cycle.corners, { x: cycle.x, z: cycle.z }];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    }
    let excess = total - cycle.maxLen;
    while (excess > 0 && cycle.corners.length > 0) {
      const tail = cycle.corners[0];
      const next = cycle.corners[1] ?? { x: cycle.x, z: cycle.z };
      const segLen = Math.hypot(next.x - tail.x, next.z - tail.z);
      if (segLen <= excess) {
        cycle.corners.shift();
        excess -= segLen;
      } else {
        tail.x += ((next.x - tail.x) / segLen) * excess;
        tail.z += ((next.z - tail.z) / segLen) * excess;
        excess = 0;
      }
    }
  }

  private seedStars(): void {
    const count = Math.floor((this.width * this.horizonY) / 9000);
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.horizonY * 0.95,
      radius: 0.4 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 1.2,
    }));
  }

  /* --- Projection & rendu --------------------------------------------------- */

  private project(x: number, z: number): { sx: number; sy: number } {
    return {
      sx: this.width / 2 + (x * FOCAL) / z,
      sy: this.horizonY + (CAM_HEIGHT * FOCAL) / z,
    };
  }

  private drawFrame(time: number): void {
    const { ctx, width, height, horizonY } = this;
    ctx.clearRect(0, 0, width, height);

    this.drawStars(time);
    this.drawHorizon();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.drawGrid();
    this.drawMesh(time);
    this.drawCycles();
    this.drawMouseTrail(time);
    ctx.restore();

    // Brume sombre en bas pour asseoir le contenu (dégradé en cache).
    if (this.fogGradient) {
      ctx.fillStyle = this.fogGradient;
      ctx.fillRect(0, horizonY, width, height - horizonY);
    }
  }

  private drawStars(time: number): void {
    const { ctx } = this;
    ctx.fillStyle = '#bfefff';
    for (const star of this.stars) {
      const twinkle = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(star.phase + time * star.speed));
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillRect(star.x, star.y, star.radius, star.radius);
    }
    ctx.globalAlpha = 1;
  }

  private drawHorizon(): void {
    const { ctx, width, horizonY } = this;
    const pulse = this.audioPulse;

    // Halos fixes — les surfaces qui pulsent lisaient comme de grands
    // rectangles clignotants ; seul le trait fin réagit au kick.
    const halo = ctx.createLinearGradient(0, horizonY - 130, 0, horizonY + 60);
    halo.addColorStop(0, 'rgba(0, 0, 0, 0)');
    halo.addColorStop(1, hexToRgba(this.accent, 0.11));
    ctx.fillStyle = halo;
    ctx.fillRect(0, horizonY - 130, width, 190);

    const glow = ctx.createLinearGradient(0, horizonY - 14, 0, horizonY + 14);
    glow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    glow.addColorStop(0.5, hexToRgba(this.accent, 0.22));
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizonY - 14, width, 28);

    ctx.fillStyle = hexToRgba(this.accent, 0.55 + 0.3 * pulse);
    ctx.fillRect(0, horizonY - 1 - pulse, width, 2 + 2 * pulse);
  }

  private drawGrid(): void {
    const { width, height, horizonY } = this;

    // Lignes verticales convergeant vers le point de fuite.
    for (let i = -26; i <= 26; i++) {
      const x = i * GRID_SPACING;
      const near = this.project(x, NEAR);
      const far = this.project(x, FAR);
      const alpha = 0.12 * (1 - Math.abs(i) / 30);
      this.strokeGlowLine(near.sx, near.sy, far.sx, far.sy, this.accent, alpha, 1);
    }

    // Lignes horizontales défilant vers la caméra.
    for (let z = NEAR + GRID_SPACING - this.scroll; z < FAR; z += GRID_SPACING) {
      const { sy } = this.project(0, z);
      if (sy > height + 4 || sy < horizonY) {
        continue;
      }
      const depth = 1 - (z - NEAR) / (FAR - NEAR);
      this.strokeGlowLine(0, sy, width, sy, this.accent, 0.035 + depth * 0.1, 1);
    }
  }

  /**
   * L'artefact : icosaèdre en fil de fer au-dessus du point de fuite —
   * rotation 3D réelle (lacet continu, tangage lent), perspective propre,
   * arêtes plus lumineuses côté caméra. Le kick le fait tourner et luire.
   */
  private drawMesh(time: number): void {
    const { ctx, width, height, horizonY } = this;
    const size = Math.min(width, height) * 0.075;
    const cx = width / 2;
    const cy = horizonY - size * 1.45;

    const yaw = this.meshAngle;
    const pitch = 0.45 + Math.sin(time * 0.13) * 0.18;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosX = Math.cos(pitch);
    const sinX = Math.sin(pitch);

    const pts = ICO_VERTS.map(([x, y, z]) => {
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      const persp = 3.4 / (3.4 + z2);
      return {
        sx: cx + ((x1 * persp) / ICO_RADIUS) * size,
        sy: cy + ((y1 * persp) / ICO_RADIUS) * size,
        z: z2,
      };
    });

    const glow = 0.15 + 0.04 * this.audioLevel + 0.18 * this.audioPulse;
    // Glow par double tracé (halo large + cœur fin), comme les traînées —
    // shadowBlur sur 30 arêtes ruinait le framerate.
    for (const [a, b] of ICO_EDGES) {
      const near = ((pts[a].z + pts[b].z) / 2 + ICO_RADIUS) / (2 * ICO_RADIUS);
      const alpha = glow * (0.3 + 0.7 * near);
      this.strokeGlowLine(
        pts[a].sx,
        pts[a].sy,
        pts[b].sx,
        pts[b].sy,
        this.accent,
        alpha * 0.35,
        3.5,
      );
      this.strokeGlowLine(pts[a].sx, pts[a].sy, pts[b].sx, pts[b].sy, this.accent, alpha, 1);
    }
    // Sommets en points lumineux discrets.
    ctx.fillStyle = hexToRgba(this.accent, Math.min(1, glow * 2.2));
    for (const p of pts) {
      ctx.fillRect(p.sx - 1, p.sy - 1, 2, 2);
    }
  }

  private drawCycles(): void {
    const { ctx } = this;

    for (const cycle of this.cycles) {
      const points = [...cycle.corners, { x: cycle.x, z: cycle.z }];
      if (points.length < 2) {
        continue;
      }

      const fadeIn = cycle.ephemeral ? Math.min(1, (7 - Math.min(cycle.ttl, 7)) * 2 + 0.4) : 1;
      const fadeOut = cycle.ephemeral ? Math.max(0, Math.min(1, cycle.ttl / 2)) : 1;
      const life = fadeIn * fadeOut;

      // Mur de lumière : segments rectilignes à luminosité constante,
      // coins à angle droit — pas de traînée qui s'évanouit.
      for (const pass of [
        { width: 4, alpha: 0.07 },
        { width: 1.4, alpha: 0.55 },
      ]) {
        ctx.beginPath();
        for (const [i, p] of points.entries()) {
          const { sx, sy } = this.project(p.x, p.z);
          if (i === 0) {
            ctx.moveTo(sx, sy);
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.strokeStyle = hexToRgba(cycle.color, pass.alpha * life);
        ctx.lineWidth = pass.width;
        ctx.lineJoin = 'miter';
        ctx.stroke();
      }

      // La moto : un point net en tête de mur, sans auréole.
      const head = this.project(cycle.x, cycle.z);
      const size = Math.max(1.4, 34 / cycle.z);
      ctx.fillStyle = hexToRgba(cycle.color, 0.95 * life);
      ctx.fillRect(head.sx - size / 2, head.sy - size / 2, size, size);
    }
  }

  /** Les dalles activées : contours néon, remplissage discret, fondu court. */
  private drawMouseTrail(time: number): void {
    const { ctx } = this;
    for (const tile of this.litTiles.values()) {
      const z1 = NEAR - this.scrollTotal + tile.zi * GRID_SPACING;
      const z2 = z1 + GRID_SPACING;
      if (z2 <= NEAR + 0.2 || z1 >= FAR * 0.75) {
        continue; // la dalle a défilé hors du sol visible
      }
      const za = Math.max(z1, NEAR + 0.2);
      const x1 = tile.xi * GRID_SPACING;
      const x2 = x1 + GRID_SPACING;
      const life = Math.max(0, 1 - (time - tile.t) / 0.9);
      const a = this.project(x1, za);
      const b = this.project(x2, za);
      const c = this.project(x2, z2);
      const d = this.project(x1, z2);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.lineTo(c.sx, c.sy);
      ctx.lineTo(d.sx, d.sy);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(this.accent, 0.07 * life);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(this.accent, 0.45 * life);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private strokeGlowLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    alpha: number,
    width: number,
  ): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = hexToRgba(color, alpha);
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
