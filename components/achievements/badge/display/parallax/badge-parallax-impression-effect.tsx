"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { getCachedBadgeMaskStyle } from "@/lib/achievements/badge/shared/render-cache";
import { prefersReducedMotion } from "@/lib/dom/prefers-reduced-motion";

type BadgeParallaxImpressionEffectProps = {
  src: string;
  sessionKey: string;
};

type GleamTone =
  | "warm"
  | "cool"
  | "white"
  | "rose"
  | "violet"
  | "mint"
  | "amber";

type GleamSpot = {
  xPct: number;
  yPct: number;
};

type Gleam = {
  key: string;
  tone: GleamTone;
  spots: GleamSpot[];
};

type BeamLengths = [number, number, number, number];

type GleamRuntime = {
  spotIndex: number;
  sizePx: number;
  beamLengths: BeamLengths;
  beamRotationDeg: number;
  pulseKey: number;
  visible: boolean;
};

const GLEAM_COUNT = 8;
const SPOTS_PER_GLEAM = 5;
const SIZE_MIN_PX = 6;
const SIZE_SPAN_PX = 6;
const BEAM_LENGTH_MIN_MULT = 1.4;
const BEAM_LENGTH_SPAN_MULT = 2;
const FLASH_MS = 1800;

function randomSizePx(): number {
  return SIZE_MIN_PX + randomInt(SIZE_SPAN_PX);
}

function randomBeamLengths(sizePx: number): BeamLengths {
  return [
    sizePx * (BEAM_LENGTH_MIN_MULT + Math.random() * BEAM_LENGTH_SPAN_MULT),
    sizePx * (BEAM_LENGTH_MIN_MULT + Math.random() * BEAM_LENGTH_SPAN_MULT),
    sizePx * (BEAM_LENGTH_MIN_MULT + Math.random() * BEAM_LENGTH_SPAN_MULT),
    sizePx * (BEAM_LENGTH_MIN_MULT + Math.random() * BEAM_LENGTH_SPAN_MULT),
  ];
}

function createRuntimeSeed(): Omit<GleamRuntime, "pulseKey" | "visible"> {
  const sizePx = randomSizePx();
  return {
    spotIndex: randomInt(SPOTS_PER_GLEAM),
    sizePx,
    beamLengths: randomBeamLengths(sizePx),
    beamRotationDeg: Math.random() * 90,
  };
}

export function BadgeParallaxImpressionEffect({
  src,
  sessionKey,
}: BadgeParallaxImpressionEffectProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const maskStyle = useMemo(() => getCachedBadgeMaskStyle(src), [src]);
  const [gleams, setGleams] = useState<Gleam[]>(() => createGleams());
  const [runtime, setRuntime] = useState<GleamRuntime[]>(() =>
    gleams.map(() => ({
      ...createRuntimeSeed(),
      pulseKey: 0,
      visible: false,
    })),
  );

  useEffect(() => {
    const next = createGleams();
    setGleams(next);
    setRuntime(
      next.map(() => ({
        ...createRuntimeSeed(),
        pulseKey: 0,
        visible: false,
      })),
    );
  }, [sessionKey, src]);

  useEffect(() => {
    setReduceMotion(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (reduceMotion || gleams.length === 0) return;

    const timers: number[] = [];

    const schedule = (index: number, initialDelayMs: number) => {
      const waitId = window.setTimeout(() => {
        setRuntime((prev) => {
          const next = [...prev];
          const current = next[index];
          if (!current) return prev;
          let spotIndex = randomInt(SPOTS_PER_GLEAM);
          if (SPOTS_PER_GLEAM > 1) {
            while (spotIndex === current.spotIndex) {
              spotIndex = randomInt(SPOTS_PER_GLEAM);
            }
          }
          const sizePx = randomSizePx();
          next[index] = {
            spotIndex,
            sizePx,
            beamLengths: randomBeamLengths(sizePx),
            beamRotationDeg: Math.random() * 90,
            pulseKey: current.pulseKey + 1,
            visible: true,
          };
          return next;
        });

        const hideId = window.setTimeout(() => {
          setRuntime((prev) => {
            const next = [...prev];
            const current = next[index];
            if (!current) return prev;
            next[index] = { ...current, visible: false };
            return next;
          });
          const gapMs = 900 + randomInt(4800);
          schedule(index, gapMs);
        }, FLASH_MS);
        timers.push(hideId);
      }, initialDelayMs);
      timers.push(waitId);
    };

    gleams.forEach((_, index) => {
      schedule(index, 200 + randomInt(3600) + index * 120);
    });

    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [gleams, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        ...maskStyle,
        transform: "translateZ(1.2px)",
      }}
    >
      {gleams.map((gleam, index) => {
        const state = runtime[index];
        if (!state) return null;
        const spot = gleam.spots[state.spotIndex];
        if (!spot) return null;
        const hostPx = Math.max(...state.beamLengths) * 2;
        const beamWidthPx = Math.max(1.25, state.sizePx * 0.2);
        return (
          <span
            key={`${gleam.key}-${state.pulseKey}`}
            className={`badge-impression-effect badge-impression-effect-${gleam.tone}${
              state.visible ? " badge-impression-effect-on" : ""
            }`}
            style={
              {
                left: `${spot.xPct}%`,
                top: `${spot.yPct}%`,
                width: `${hostPx}px`,
                height: `${hostPx}px`,
              } as CSSProperties
            }
          >
            <span
              className="badge-impression-effect-core"
              style={{
                width: `${state.sizePx}px`,
                height: `${state.sizePx}px`,
              }}
            />
            {state.beamLengths.map((lengthPx, beamIndex) => (
              <span
                key={beamIndex}
                className="badge-impression-effect-beam"
                style={{
                  width: `${beamWidthPx}px`,
                  height: `${lengthPx}px`,
                  transform: `translate(-50%, -100%) rotate(${
                    state.beamRotationDeg + beamIndex * 90
                  }deg)`,
                }}
              />
            ))}
          </span>
        );
      })}
    </div>
  );
}

function createGleams(): Gleam[] {
  const tones: GleamTone[] = [
    "warm",
    "cool",
    "white",
    "rose",
    "violet",
    "mint",
    "amber",
  ];
  const viewSalt = randomUint32();
  const gleams: Gleam[] = [];

  for (let i = 0; i < GLEAM_COUNT; i++) {
    const spots: GleamSpot[] = [];
    for (let s = 0; s < SPOTS_PER_GLEAM; s++) {
      const a = (viewSalt + i * 97 + s * 2654435761) >>> 0;
      const b = Math.imul(a ^ (a >>> 15), 2246822519) >>> 0;
      const u = (b & 0xffff) / 0xffff;
      const v = ((b >>> 16) & 0xffff) / 0xffff;
      spots.push({
        xPct: 12 + u * 76,
        yPct: 14 + v * 72,
      });
    }

    gleams.push({
      key: `gleam-${viewSalt.toString(36)}-${i}`,
      tone: tones[(viewSalt + i * 3) % tones.length],
      spots,
    });
  }

  return gleams;
}

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(Math.random() * maxExclusive);
}

function randomUint32(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0]!;
  }
  return Math.floor(Math.random() * 0xffffffff);
}
