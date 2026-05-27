"use client";

import { memo, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

const PLACEHOLDER_FLIP_MS = 42;

function randomChar(charset: string): string {
  return charset[Math.floor(Math.random() * charset.length)] ?? "?";
}

function buildScrambledDisplay(
  target: string,
  revealedCount: number,
  charset: string,
): string[] {
  return target.split("").map((char, index) =>
    index < revealedCount ? char : randomChar(charset),
  );
}

type EncryptedTextProps = {
  text: string;
  className?: string;
  revealDelayMs?: number;
  flipDelayMs?: number;
  charset?: string;
  encryptedClassName?: string;
  revealedClassName?: string;
};

/**
 * Scrambled text that reveals character-by-character (Aceternity-style).
 * Updates are confined to this component so parent trees are not re-rendered
 * on every flip.
 *
 * @see https://ui.aceternity.com/components/encrypted-text
 */
export const EncryptedText = memo(function EncryptedText({
  text,
  className,
  revealDelayMs = 50,
  flipDelayMs = 50,
  charset = DEFAULT_CHARSET,
  encryptedClassName,
  revealedClassName,
}: EncryptedTextProps) {
  const textRef = useRef(text);
  const charsetRef = useRef(charset);
  const revealedRef = useRef(0);

  const [revealedIndex, setRevealedIndex] = useState(0);
  const [display, setDisplay] = useState<string[]>(() =>
    buildScrambledDisplay(text, 0, charset),
  );

  useEffect(() => {
    textRef.current = text;
    charsetRef.current = charset;
    revealedRef.current = 0;
    setRevealedIndex(0);
    setDisplay(buildScrambledDisplay(text, 0, charset));
  }, [charset, text]);

  useEffect(() => {
    const applyScramble = () => {
      const target = textRef.current;
      const revealed = revealedRef.current;
      if (revealed >= target.length) return;
      setDisplay(buildScrambledDisplay(target, revealed, charsetRef.current));
    };

    const revealTimer = window.setInterval(() => {
      const target = textRef.current;
      if (revealedRef.current >= target.length) return;
      revealedRef.current += 1;
      setRevealedIndex(revealedRef.current);
      setDisplay(buildScrambledDisplay(target, revealedRef.current, charsetRef.current));
    }, revealDelayMs);

    const flipTimer = window.setInterval(applyScramble, flipDelayMs);

    return () => {
      window.clearInterval(revealTimer);
      window.clearInterval(flipTimer);
    };
  }, [flipDelayMs, revealDelayMs, text]);

  const done = revealedIndex >= text.length;

  return (
    <span className={cn("inline", className)} aria-hidden={!done}>
      {display.map((char, index) => (
        <span
          key={index}
          className={index < revealedIndex ? revealedClassName : encryptedClassName}
        >
          {char}
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </span>
  );
});

type EncryptedTextPlaceholderProps = {
  length?: number;
  className?: string;
  encryptedClassName?: string;
};

/**
 * Rapid scramble while a label is loading. Per-character DOM updates via rAF
 * avoid React re-renders in ancestors (e.g. achievement detail + 3D badge).
 */
export const EncryptedTextPlaceholder = memo(function EncryptedTextPlaceholder({
  length = 10,
  className,
  encryptedClassName,
}: EncryptedTextPlaceholderProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const lengthRef = useRef(length);
  const classRef = useRef(encryptedClassName);

  useEffect(() => {
    lengthRef.current = length;
  }, [length]);

  useEffect(() => {
    classRef.current = encryptedClassName;
  }, [encryptedClassName]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ensureSpans = (count: number) => {
      while (root.childNodes.length < count) {
        const span = document.createElement("span");
        if (classRef.current) span.className = classRef.current;
        root.appendChild(span);
      }
      while (root.childNodes.length > count) {
        root.removeChild(root.lastChild!);
      }
      return Array.from(root.children) as HTMLSpanElement[];
    };

    let spans = ensureSpans(lengthRef.current);
    let rafId = 0;
    let lastFlip = 0;

    const flip = (now: number) => {
      const count = lengthRef.current;
      if (spans.length !== count) {
        spans = ensureSpans(count);
      }
      if (now - lastFlip >= PLACEHOLDER_FLIP_MS) {
        lastFlip = now;
        const charset = DEFAULT_CHARSET;
        for (let i = 0; i < spans.length; i += 1) {
          const node = spans[i];
          if (classRef.current && node.className !== classRef.current) {
            node.className = classRef.current;
          }
          node.textContent = randomChar(charset);
        }
      }
      rafId = window.requestAnimationFrame(flip);
    };

    rafId = window.requestAnimationFrame(flip);
    return () => window.cancelAnimationFrame(rafId);
  }, [length]);

  return (
    <span
      ref={rootRef}
      className={cn("inline font-semibold tabular-nums", className)}
      aria-hidden
    />
  );
});
