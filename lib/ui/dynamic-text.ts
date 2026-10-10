export const NICKNAME_MAX_LENGTH = 18;

const AVERAGE_CHAR_EM = 0.55;
const SCRAMBLE_CHAR_EM = 0.72;

export function clampDynamicText(text: string, maxLength: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxLength - 1))}…`;
}

export function clampNickname(text: string): string {
  return clampDynamicText(text, NICKNAME_MAX_LENGTH);
}

export function dynamicTextWidthPx(
  text: string,
  fontSizePx: number,
  scramble: boolean,
): number {
  const em = scramble ? SCRAMBLE_CHAR_EM : AVERAGE_CHAR_EM;
  return text.length * fontSizePx * em;
}

export function labeledValueStacks(args: {
  prefix: string;
  value: string;
  lineWidthPx: number;
  fontSizePx: number;
}): boolean {
  const value = clampNickname(args.value);
  const width =
    dynamicTextWidthPx(args.prefix, args.fontSizePx, false) +
    dynamicTextWidthPx(" ", args.fontSizePx, false) +
    dynamicTextWidthPx(value, args.fontSizePx, true);
  return width > args.lineWidthPx;
}
