/** Flat image badge: masks, glitter, unlock shapes. */

export {
  badgeImageMaskStyle,
  badgeImageMaskStylePadded,
  circularBadgeMaskStyle,
  paddedBadgeMaskStyle,
} from "./badge-mask-style";

export { buildGlitterParticles } from "./glitter-particles";

export {
  buildUnlockRevealClipPath,
  buildUnlockRevealClipPathLut,
  estimateUnlockRevealCompletionProgress,
  getAlphaMaskStyle,
  isOpaqueBadgeHit,
  loadAlphaMaskDataFromImage,
  unlockRevealLutSteps,
  type AlphaMaskData,
} from "./shape-utils";
