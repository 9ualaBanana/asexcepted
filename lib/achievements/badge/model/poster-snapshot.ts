import { Scene, type Object3D, WebGLRenderer } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { badgeModelConfig } from "@/lib/achievements/badge/model/badge-model-config";
import { buildBadgeModelSceneGraph } from "@/lib/achievements/badge/model/scene-graph";
import {
  applyBadgeModelEnvironment,
  configureBadgeModelRenderer,
} from "@/lib/achievements/badge/model/studio-environment";
import type { AnimationMixer, PerspectiveCamera } from "three";

export const BADGE_MODEL_POSTER_PREVIEW_SIZE_PX = badgeModelConfig.poster.previewSizePx;

/** One offscreen WebGL context for all pose poster snapshots (avoids context limit). */
let sharedPosterRenderer: WebGLRenderer | null = null;

export async function renderBadgeModelPosterFromGltf(
  gltf: GLTF,
  yaw: number,
  pitch: number,
): Promise<Blob> {
  const renderer = getSharedPosterRenderer();
  const scene = new Scene();
  await applyBadgeModelEnvironment(scene, renderer);
  renderer.setClearColor(0x000000, 0);

  const { orbitRoot, camera, mixer } = buildBadgeModelSceneGraph(gltf, yaw, pitch);
  scene.add(orbitRoot);

  try {
    const warmupFrames = mixer ? 3 : 2;
    for (let frame = 0; frame < warmupFrames; frame += 1) {
      renderBadgeModelFrame(renderer, scene, camera, mixer, 1 / 30);
    }

    return await canvasToPngBlob(renderer.domElement);
  } finally {
    mixer?.stopAllAction();
    disposeObject3D(orbitRoot);
    scene.clear();
  }
}

function renderBadgeModelFrame(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  mixer: AnimationMixer | null,
  deltaSeconds: number,
): void {
  if (mixer && deltaSeconds > 0) {
    mixer.update(deltaSeconds);
  }
  renderer.render(scene, camera);
}

function getSharedPosterRenderer(): WebGLRenderer {
  if (sharedPosterRenderer) {
    configureBadgeModelRenderer(sharedPosterRenderer);
    sharedPosterRenderer.setSize(
      BADGE_MODEL_POSTER_PREVIEW_SIZE_PX,
      BADGE_MODEL_POSTER_PREVIEW_SIZE_PX,
      false,
    );
    sharedPosterRenderer.setClearColor(0x000000, 0);
    return sharedPosterRenderer;
  }

  const canvas = document.createElement("canvas");
  sharedPosterRenderer = new WebGLRenderer({
    canvas,
    alpha: true,
    premultipliedAlpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  sharedPosterRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  sharedPosterRenderer.setSize(
    BADGE_MODEL_POSTER_PREVIEW_SIZE_PX,
    BADGE_MODEL_POSTER_PREVIEW_SIZE_PX,
    false,
  );
  configureBadgeModelRenderer(sharedPosterRenderer);
  sharedPosterRenderer.setClearColor(0x000000, 0);
  return sharedPosterRenderer;
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png");
  });
  if (!blob) {
    throw new Error("Could not generate a badge preview from this model.");
  }
  return blob;
}

function disposeMaterial(value: unknown): void {
  if (!value || typeof value !== "object" || !("dispose" in value)) return;
  const disposer = value.dispose;
  if (typeof disposer === "function") {
    disposer.call(value);
  }
}

function disposeObject3D(root: Object3D): void {
  root.traverse((object) => {
    const geometry = (object as { geometry?: { dispose?: () => void } }).geometry;
    if (geometry && typeof geometry.dispose === "function") {
      geometry.dispose();
    }

    const material = (object as { material?: unknown }).material;
    if (material !== undefined) {
      if (Array.isArray(material)) {
        material.forEach(disposeMaterial);
      } else {
        disposeMaterial(material);
      }
    }
  });
}
