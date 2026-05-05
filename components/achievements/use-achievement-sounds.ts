"use client";

import { useCallback, useEffect, useRef } from "react";

const AUDIO_ASSET_VERSION = process.env.NEXT_PUBLIC_BUILD_ID?.trim() || "dev";
const UNLOCK_PEEL_AUDIO_SRC = `/audio/unlock-peel.wav?v=${AUDIO_ASSET_VERSION}`;
const UNLOCK_EASE_OUT_AUDIO_SRC = `/audio/unlock-ease-out.wav?v=${AUDIO_ASSET_VERSION}`;
const SAVE_POP_AUDIO_SRC = `/audio/pop.mp3?v=${AUDIO_ASSET_VERSION}`;

type DecodedBurst = {
  peel: AudioBuffer;
  easeOut: AudioBuffer;
  pop: AudioBuffer;
};

let sharedCtx: AudioContext | null = null;
let decoded: DecodedBurst | null = null;
let decodePromise: Promise<DecodedBurst | null> | null = null;

function webkitBackedAudioCtx(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? w.webkitAudioContext;
}

function acquireSharedContext(): AudioContext | null {
  const AudioCtx = webkitBackedAudioCtx();
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    try {
      sharedCtx = new AudioCtx({ latencyHint: "interactive" });
    } catch {
      return null;
    }
  }
  return sharedCtx;
}

function clearMediaSessionNowPlaying(): void {
  if (typeof navigator === "undefined") return;
  const ms = navigator.mediaSession;
  if (!ms) return;
  try {
    ms.metadata = null;
    ms.playbackState = "none";
  } catch {
    // ignore
  }
}

function safeStopSrc(node: AudioBufferSourceNode | null): void {
  if (!node) return;
  try {
    node.stop(0);
  } catch {
    // already stopped / not started
  }
  try {
    node.disconnect();
  } catch {
    // ignore
  }
}

async function decodeAllBurstSamples(): Promise<DecodedBurst | null> {
  if (decoded) return decoded;
  if (!decodePromise) {
    decodePromise = (async () => {
      const ctx = acquireSharedContext();
      if (!ctx) return null;

      const decodeUrl = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const raw = await res.arrayBuffer();
        return ctx.decodeAudioData(raw.slice(0));
      };

      try {
        const [peel, easeOut, pop] = await Promise.all([
          decodeUrl(UNLOCK_PEEL_AUDIO_SRC),
          decodeUrl(UNLOCK_EASE_OUT_AUDIO_SRC),
          decodeUrl(SAVE_POP_AUDIO_SRC),
        ]);
        decoded = { peel, easeOut, pop };
        return decoded;
      } catch {
        return null;
      }
    })().finally(() => {
      decodePromise = null;
    });
  }
  return decodePromise;
}

async function resumeContextIfSuspended(): Promise<void> {
  const ctx = acquireSharedContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Runs only when the context is `running`; inaudible so it does not register as audible media routing.
 * iOS Safari often requires a routing “poke” tied to gesture + resumed context before deferred `start()` calls work.
 */
function openSilentRoutingBurst(ctx: AudioContext): void {
  if (ctx.state !== "running") return;
  try {
    const sampleRate = ctx.sampleRate;
    const frames = Math.min(2048, Math.max(128, Math.floor(sampleRate * 0.02)));
    const buffer = ctx.createBuffer(1, frames, sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime;
    const dur = frames / sampleRate;
    src.start(t0);
    src.stop(t0 + dur);
    src.onended = () => {
      try {
        src.disconnect();
        gain.disconnect();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* ignore */
  }
}

/**
 * Call from a **pointer/touch down** (user gesture). Awaits resume + decode so timer-based unlock audio can play on iOS.
 */
async function prepareUnlockAudioForGesture(): Promise<void> {
  void decodeAllBurstSamples();
  await resumeContextIfSuspended();
  const ctx = acquireSharedContext();
  if (ctx?.state === "running") {
    openSilentRoutingBurst(ctx);
  }
  await decodeAllBurstSamples();
}

function playDecodedBuffer(params: {
  buffer: AudioBuffer;
  prevSourceRef: { current: AudioBufferSourceNode | null };
}) {
  const ctx = acquireSharedContext();
  if (!ctx || ctx.state !== "running") return false;

  const { buffer, prevSourceRef } = params;
  safeStopSrc(prevSourceRef.current);
  prevSourceRef.current = null;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  prevSourceRef.current = src;

  src.onended = () => {
    queueMicrotask(clearMediaSessionNowPlaying);
    if (prevSourceRef.current === src) {
      prevSourceRef.current = null;
    }
    try {
      src.disconnect();
    } catch {
      /* ignore */
    }
  };

  queueMicrotask(clearMediaSessionNowPlaying);

  try {
    src.start(ctx.currentTime);
    return true;
  } catch {
    prevSourceRef.current = null;
    return false;
  }
}

function playDecodedPopFireAndForget(buffer: AudioBuffer): boolean {
  const ctx = acquireSharedContext();
  if (!ctx || ctx.state !== "running") return false;
  let src: AudioBufferSourceNode;
  try {
    src = ctx.createBufferSource();
  } catch {
    return false;
  }
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.onended = () => {
    queueMicrotask(clearMediaSessionNowPlaying);
    try {
      src.disconnect();
    } catch {
      /* ignore */
    }
  };
  queueMicrotask(clearMediaSessionNowPlaying);
  try {
    src.start(ctx.currentTime);
    return true;
  } catch {
    return false;
  }
}

function playBurstSyncOrDefer(params: {
  bufferKey: keyof DecodedBurst;
  prevSourceRef: { current: AudioBufferSourceNode | null };
}): void {
  if (typeof window === "undefined") return;
  const { bufferKey, prevSourceRef } = params;
  const ctx = acquireSharedContext();
  if (decoded && ctx?.state === "running") {
    playDecodedBuffer({ buffer: decoded[bufferKey], prevSourceRef });
    return;
  }
  void (async () => {
    await resumeContextIfSuspended();
    const pack = decoded ?? (await decodeAllBurstSamples());
    if (!pack) return;
    playDecodedBuffer({ buffer: pack[bufferKey], prevSourceRef });
  })();
}

/**
 * Short UI bursts through Web Audio (decoded buffers + `start(audioContext.currentTime)`).
 * Avoids `<audio>` tags that iOS exposes on the lock screen / Now Playing.
 */
export function useAchievementSounds() {
  const peelSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const easeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const prefetchAchievementSounds = useCallback(() => {
    void decodeAllBurstSamples();
  }, []);

  const stopUnlockSound = useCallback(() => {
    safeStopSrc(peelSourceRef.current);
    peelSourceRef.current = null;
    clearMediaSessionNowPlaying();
  }, []);

  const stopUnlockEaseOutSound = useCallback(() => {
    safeStopSrc(easeSourceRef.current);
    easeSourceRef.current = null;
    clearMediaSessionNowPlaying();
  }, []);

  const playUnlockTimelineSound = useCallback(() => {
    playBurstSyncOrDefer({ bufferKey: "peel", prevSourceRef: peelSourceRef });
  }, []);

  const playUnlockEaseOutSound = useCallback(() => {
    playBurstSyncOrDefer({ bufferKey: "easeOut", prevSourceRef: easeSourceRef });
  }, []);

  const primeUnlockAudioGestureContext = useCallback(() => {
    void prepareUnlockAudioForGesture();
  }, []);

  const playSavePop = useCallback(() => {
    if (typeof window === "undefined") return;

    const trySync = () => {
      if (!decoded || acquireSharedContext()?.state !== "running") return false;
      return playDecodedPopFireAndForget(decoded.pop);
    };
    if (trySync()) return;

    void (async () => {
      await resumeContextIfSuspended();
      const ctxWarm = acquireSharedContext();
      if (ctxWarm?.state === "running") {
        openSilentRoutingBurst(ctxWarm);
      }
      const pack = decoded ?? (await decodeAllBurstSamples());
      if (!pack) return;
      if (!playDecodedPopFireAndForget(pack.pop)) return;
    })();
  }, []);

  useEffect(() => {
    void decodeAllBurstSamples();
    return () => {
      stopUnlockSound();
      stopUnlockEaseOutSound();
      clearMediaSessionNowPlaying();
    };
  }, [stopUnlockEaseOutSound, stopUnlockSound]);

  return {
    stopUnlockSound,
    playUnlockTimelineSound,
    playUnlockEaseOutSound,
    primeUnlockAudioGestureContext,
    prepareUnlockAudioForGesture,
    prefetchAchievementSounds,
    playSavePop,
  };
}
