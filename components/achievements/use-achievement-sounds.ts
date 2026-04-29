"use client";

import { useCallback, useEffect, useRef } from "react";

const AUDIO_ASSET_VERSION = process.env.NEXT_PUBLIC_BUILD_ID?.trim() || "dev";
const UNLOCK_PEEL_AUDIO_SRC = `/audio/unlock-peel.wav?v=${AUDIO_ASSET_VERSION}`;
const UNLOCK_EASE_OUT_AUDIO_SRC = `/audio/unlock-ease-out.wav?v=${AUDIO_ASSET_VERSION}`;
const SAVE_POP_AUDIO_SRC = `/audio/pop.mp3?v=${AUDIO_ASSET_VERSION}`;

export function useAchievementSounds() {
  const unlockAudioRef = useRef<HTMLAudioElement | null>(null);
  const unlockAudioPreparedRef = useRef<HTMLAudioElement | null>(null);
  const unlockSfxContextRef = useRef<AudioContext | null>(null);
  const unlockEaseOutBufferRef = useRef<AudioBuffer | null>(null);
  const unlockEaseOutSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const savePopPreparedRef = useRef<HTMLAudioElement | null>(null);

  const clearMediaSessionNowPlaying = useCallback(() => {
    if (typeof navigator === "undefined") return;
    const mediaSession = (
      navigator as Navigator & {
        mediaSession?: {
          metadata: MediaMetadata | null;
          playbackState?: "none" | "paused" | "playing";
        };
      }
    ).mediaSession;
    if (!mediaSession) return;
    try {
      mediaSession.metadata = null;
      if (typeof mediaSession.playbackState === "string") {
        mediaSession.playbackState = "none";
      }
    } catch {
      // ignore media session write failures
    }
  }, []);

  const stopUnlockSound = useCallback(() => {
    const audio = unlockAudioRef.current;
    unlockAudioRef.current = null;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    clearMediaSessionNowPlaying();
  }, [clearMediaSessionNowPlaying]);

  const playUnlockTimelineSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      stopUnlockSound();
      const audio = unlockAudioPreparedRef.current ?? new Audio(UNLOCK_PEEL_AUDIO_SRC);
      audio.preload = "auto";
      audio.currentTime = 0;
      audio.volume = 1;
      audio.onended = () => {
        if (unlockAudioRef.current === audio) {
          unlockAudioRef.current = null;
        }
        clearMediaSessionNowPlaying();
      };
      unlockAudioRef.current = audio;
      void audio.play().catch(() => {
        // ignore blocked autoplay / unavailable media
      });
    } catch {
      // ignore unsupported / blocked audio
    }
  }, [clearMediaSessionNowPlaying, stopUnlockSound]);

  const playUnlockEaseOutSound = useCallback(() => {
    if (typeof window === "undefined") return;
    const Ctor =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!Ctor) return;

    const ctx = unlockSfxContextRef.current ?? new Ctor();
    unlockSfxContextRef.current = ctx;

    const playWithBuffer = (buffer: AudioBuffer) => {
      try {
        unlockEaseOutSourceRef.current?.stop();
      } catch {
        // ignore
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 1;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.onended = () => {
        if (unlockEaseOutSourceRef.current === source) {
          unlockEaseOutSourceRef.current = null;
        }
      };
      unlockEaseOutSourceRef.current = source;
      source.start(0);
    };

    const run = async () => {
      if (ctx.state !== "running") {
        await ctx.resume();
      }
      if (!unlockEaseOutBufferRef.current) {
        const response = await fetch(UNLOCK_EASE_OUT_AUDIO_SRC, { cache: "force-cache" });
        const arr = await response.arrayBuffer();
        unlockEaseOutBufferRef.current = await ctx.decodeAudioData(arr);
      }
      if (unlockEaseOutBufferRef.current) {
        playWithBuffer(unlockEaseOutBufferRef.current);
      }
    };

    void run().catch(() => {
      // Intentionally no fallback: this cue must come from its own audio asset.
    });
  }, []);

  const primeUnlockAudioGestureContext = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const Ctor =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!Ctor) return;
      const ctx = unlockSfxContextRef.current ?? new Ctor();
      unlockSfxContextRef.current = ctx;
      void ctx.resume();
      if (!unlockEaseOutBufferRef.current) {
        void fetch(UNLOCK_EASE_OUT_AUDIO_SRC, { cache: "force-cache" })
          .then((res) => res.arrayBuffer())
          .then((arr) => ctx.decodeAudioData(arr))
          .then((buffer) => {
            unlockEaseOutBufferRef.current = buffer;
          })
          .catch(() => {
            // keep silent, retry on play
          });
      }
    } catch {
      // no-op
    }
  }, []);

  const playSavePop = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const audio = savePopPreparedRef.current ?? new Audio(SAVE_POP_AUDIO_SRC);
      audio.preload = "auto";
      audio.currentTime = 0;
      audio.volume = 1;
      audio.onended = () => {
        clearMediaSessionNowPlaying();
      };
      savePopPreparedRef.current = audio;
      void audio.play().catch(() => {
        // ignore blocked autoplay / unavailable media
      });
    } catch {
      // ignore unsupported / blocked audio
    }
  }, [clearMediaSessionNowPlaying]);

  useEffect(() => {
    // Preload once to avoid first-play lag on deployed environments.
    const peel = new Audio(UNLOCK_PEEL_AUDIO_SRC);
    peel.preload = "auto";
    peel.load();
    unlockAudioPreparedRef.current = peel;

    const savePop = new Audio(SAVE_POP_AUDIO_SRC);
    savePop.preload = "auto";
    savePop.load();
    savePopPreparedRef.current = savePop;

    return () => {
      stopUnlockSound();
      unlockAudioPreparedRef.current = null;
      savePopPreparedRef.current?.pause();
      savePopPreparedRef.current = null;
      unlockEaseOutBufferRef.current = null;
      try {
        unlockEaseOutSourceRef.current?.stop();
      } catch {
        // ignore
      }
      unlockEaseOutSourceRef.current = null;
      unlockSfxContextRef.current?.close().catch(() => undefined);
      unlockSfxContextRef.current = null;
      clearMediaSessionNowPlaying();
    };
  }, [clearMediaSessionNowPlaying, stopUnlockSound]);

  return {
    stopUnlockSound,
    playUnlockTimelineSound,
    playUnlockEaseOutSound,
    primeUnlockAudioGestureContext,
    playSavePop,
  };
}
