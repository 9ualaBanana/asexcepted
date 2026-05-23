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

export function buildGlitterParticles(
  seed: string,
  count: number,
  salt = 0,
): GlitterParticleSpec[] {
  let state = hashSeed(`${seed}:${salt}`);
  const particles: GlitterParticleSpec[] = [];

  for (let i = 0; i < count; i++) {
    state = (state + i * 2654435761) >>> 0;
    const r1 = mulberry32(state);
    const r2 = mulberry32(state ^ 0x9e3779b9);
    const r3 = mulberry32(state ^ 0x85ebca6b);
    const r4 = mulberry32(state ^ 0xc2b2ae35);
    const r5 = mulberry32(state ^ 0x27d4eb2f);

    particles.push({
      id: i,
      leftPct: 6 + r1 * 88,
      topPct: 6 + r2 * 88,
      sizePx: 2 + Math.floor(r3 * 2.8),
      delayMs: Math.floor(r4 * 4200),
      durationMs: 2200 + Math.floor(r5 * 2800),
      driftX: (r1 - 0.5) * 18,
      driftY: (r2 - 0.5) * 16,
      driftZ: (r3 - 0.5) * 10,
      palette: PALETTES[i % PALETTES.length]!,
    });
  }

  return particles;
}
