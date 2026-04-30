"use client";

import { useCallback, useEffect, useRef } from "react";

const AUDIO_ASSET_VERSION = process.env.NEXT_PUBLIC_BUILD_ID?.trim() || "dev";
const UNLOCK_PEEL_AUDIO_SRC = `/audio/unlock-peel.wav?v=${AUDIO_ASSET_VERSION}`;
const UNLOCK_EASE_OUT_AUDIO_SRC = `/audio/unlock-ease-out.wav?v=${AUDIO_ASSET_VERSION}`;
const SAVE_POP_AUDIO_SRC = `/audio/pop.mp3?v=${AUDIO_ASSET_VERSION}`;

export function useAchievementSounds() {
  const unlockAudioRef = useRef<HTMLAudioElement | null>(null);
  const unlockAudioPreparedRef = useRef<HTMLAudioElement | null>(null);
  const unlockEaseOutAudioRef = useRef<HTMLAudioElement | null>(null);
  const unlockEaseOutPreparedRef = useRef<HTMLAudioElement | null>(null);
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

  const stopUnlockEaseOutSound = useCallback(() => {
    const audio = unlockEaseOutAudioRef.current;
    unlockEaseOutAudioRef.current = null;
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

  /** Same transport as peel (HTMLAudio) so playback still works after the reveal delay (Web Audio context suspend). */
  const playUnlockEaseOutSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      stopUnlockEaseOutSound();
      const audio = unlockEaseOutPreparedRef.current ?? new Audio(UNLOCK_EASE_OUT_AUDIO_SRC);
      audio.preload = "auto";
      audio.currentTime = 0;
      audio.volume = 1;
      audio.onended = () => {
        if (unlockEaseOutAudioRef.current === audio) {
          unlockEaseOutAudioRef.current = null;
        }
        clearMediaSessionNowPlaying();
      };
      unlockEaseOutAudioRef.current = audio;
      void audio.play().catch(() => {
        // ignore blocked autoplay / unavailable media
      });
    } catch {
      // ignore unsupported / blocked audio
    }
  }, [clearMediaSessionNowPlaying, stopUnlockEaseOutSound]);

  const primeUnlockAudioGestureContext = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      unlockEaseOutPreparedRef.current?.load();
      unlockAudioPreparedRef.current?.load();
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
    const peel = new Audio(UNLOCK_PEEL_AUDIO_SRC);
    peel.preload = "auto";
    peel.load();
    unlockAudioPreparedRef.current = peel;

    const easeOut = new Audio(UNLOCK_EASE_OUT_AUDIO_SRC);
    easeOut.preload = "auto";
    easeOut.load();
    unlockEaseOutPreparedRef.current = easeOut;

    const savePop = new Audio(SAVE_POP_AUDIO_SRC);
    savePop.preload = "auto";
    savePop.load();
    savePopPreparedRef.current = savePop;

    return () => {
      stopUnlockSound();
      stopUnlockEaseOutSound();
      unlockAudioPreparedRef.current = null;
      unlockEaseOutPreparedRef.current = null;
      savePopPreparedRef.current?.pause();
      savePopPreparedRef.current = null;
      clearMediaSessionNowPlaying();
    };
  }, [clearMediaSessionNowPlaying, stopUnlockEaseOutSound, stopUnlockSound]);

  return {
    stopUnlockSound,
    playUnlockTimelineSound,
    playUnlockEaseOutSound,
    primeUnlockAudioGestureContext,
    playSavePop,
  };
}
