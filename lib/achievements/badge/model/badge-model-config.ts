/** Central tuning knobs for live viewer, poster snapshots, and interaction. */

export const badgeModelConfig = {
  camera: {
    fov: Number(process.env.NEXT_PUBLIC_BADGE_MODEL_CAMERA_FOV),
    shellPivotOffsetRatio: Number(
      process.env.NEXT_PUBLIC_BADGE_MODEL_SHELL_PIVOT_OFFSET_RATIO,
    ),
    shellMaxRadiusCv: Number(process.env.NEXT_PUBLIC_BADGE_MODEL_SHELL_MAX_RADIUS_CV),
    shellMinMeanRadiusRatio: Number(
      process.env.NEXT_PUBLIC_BADGE_MODEL_SHELL_MIN_MEAN_RADIUS_RATIO,
    ),
  },
  renderer: {
    toneMappingExposure: Number(
      process.env.NEXT_PUBLIC_BADGE_MODEL_TONE_MAPPING_EXPOSURE,
    ),
  },
  environment: {
    intensity: Number(process.env.NEXT_PUBLIC_BADGE_MODEL_ENVIRONMENT_INTENSITY),
    studioHdrUrl:
      process.env.NEXT_PUBLIC_BADGE_MODEL_STUDIO_HDR_URL?.trim() ||
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr",
  },
  animation: {
    minSpeed: 0.1,
    maxSpeed: 2,
    visualReadyDelayMs: 140,
  },
  interaction: {
    maxPitchRad: Math.PI / 2.2,
    dragYawSensitivity: 0.0072,
    dragPitchSensitivity: 0.0054,
    inertiaDamping: 0.93,
    inertiaMinSpeed: 0.00035,
  },
  poster: {
    previewSizePx: 768,
  },
} as const;
