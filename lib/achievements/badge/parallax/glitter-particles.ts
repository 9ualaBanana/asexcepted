export type GlitterParticleSpec = {
  id: number;
  leftPct: number;
  topPct: number;
  sizePx: number;
  delayMs: number;
  durationMs: number;
  driftX: number;
  driftY: number;
  driftZ: number;
  palette: "gold" | "rose" | "cream" | "champagne";
};

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): number {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const PALETTES: GlitterParticleSpec["palette"][] = [
  "gold",
  "champagne",
  "cream",
  "rose",
  "gold",
  "champagne",
];

/** Particles spread across the mask with inset + capped drift so motion stays inside. */
export function buildGlitterParticles(
  seed: string,
  count: number,
  salt = 0,
  options?: {
    marginPct?: number;
    maxDriftPx?: number;
    sizeMinPx?: number;
    sizeRangePx?: number;
  },
): GlitterParticleSpec[] {
  const margin = options?.marginPct ?? 11;
  const maxDrift = options?.maxDriftPx ?? 7;
  const sizeMin = options?.sizeMinPx ?? 2;
  const sizeRange = options?.sizeRangePx ?? 2.2;
  const span = 100 - margin * 2;

  let state = hashSeed(`${seed}:${salt}`);
  const particles: GlitterParticleSpec[] = [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * 1.15)));
  const rows = Math.max(1, Math.ceil(count / cols));

  for (let i = 0; i < count; i++) {
    state = (state + i * 2654435761) >>> 0;
    const r1 = mulberry32(state);
    const r2 = mulberry32(state ^ 0x9e3779b9);
    const r3 = mulberry32(state ^ 0x85ebca6b);
    const r4 = mulberry32(state ^ 0xc2b2ae35);
    const r5 = mulberry32(state ^ 0x27d4eb2f);

    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellW = span / cols;
    const cellH = span / rows;
    const leftPct =
      margin + col * cellW + cellW * 0.5 + (r1 - 0.5) * cellW * 0.72;
    const topPct =
      margin + row * cellH + cellH * 0.5 + (r2 - 0.5) * cellH * 0.72;

    particles.push({
      id: i,
      leftPct,
      topPct,
      sizePx: sizeMin + Math.floor(r3 * sizeRange),
      delayMs: Math.floor(r4 * 4200),
      durationMs: 2200 + Math.floor(r5 * 2800),
      driftX: (r3 - 0.5) * maxDrift * 2,
      driftY: (r4 - 0.5) * maxDrift * 2,
      driftZ: (r5 - 0.5) * maxDrift * 0.35,
      palette: PALETTES[i % PALETTES.length]!,
    });
  }

  return particles;
}
