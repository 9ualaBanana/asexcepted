"use client";

import {
  AnimationMixer,
  LoopRepeat,
  PerspectiveCamera,
  Group,
  Scene,
  WebGLRenderer,
  type Object3D,
} from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import {
  BADGE_MODEL_MAX_FILE_BYTES,
  isGlbHeader,
  looksLikeGlbUpload,
} from "@/lib/achievements/badge-assets";
import {
  applyBadgeModelPose,
  BADGE_MODEL_POSE_PRESETS,
} from "@/lib/achievements/badge-model-poses";
import {
  centerBadgeModelAtOrigin,
  configureBadgeModelLoader,
  configureBadgePosterRenderer,
  frameCameraForBadgeModel,
  prepareBadgeModelMaterialsForPoster,
  setupBadgeModelScene,
} from "@/lib/achievements/badge-model-rendering";

const PREVIEW_SIZE_PX = 768;

export type PreparedBadgeModelUpload = {
  initialPreviewBlob: Blob;
  initialPreviewUrl: string;
  initialYaw: number;
  initialPitch: number;
  createPreviewBlob: (yaw: number, pitch: number) => Promise<Blob>;
};

/** One offscreen WebGL context for all pose poster snapshots (avoids context limit). */
let sharedPosterRenderer: WebGLRenderer | null = null;

function getSharedPosterRenderer(): WebGLRenderer {
  if (sharedPosterRenderer) {
    configureBadgePosterRenderer(sharedPosterRenderer);
    sharedPosterRenderer.setSize(PREVIEW_SIZE_PX, PREVIEW_SIZE_PX, false);
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
  sharedPosterRenderer.setSize(PREVIEW_SIZE_PX, PREVIEW_SIZE_PX, false);
  configureBadgePosterRenderer(sharedPosterRenderer);
  sharedPosterRenderer.setClearColor(0x000000, 0);
  return sharedPosterRenderer;
}

function disposeMaterial(value: unknown): void {
  if (!value || typeof value !== "object" || !("dispose" in value)) return;
  const disposer = (value as { dispose?: () => void }).dispose;
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

function createConfiguredGlbLoader() {
  const loader = new GLTFLoader();
  const dracoLoader = configureBadgeModelLoader(loader);
  return { loader, dracoLoader };
}

async function parseGlbFile(file: File): Promise<GLTF> {
  if (file.size > BADGE_MODEL_MAX_FILE_BYTES) {
    throw new Error("3D badge files must be 50 MB or smaller.");
  }
  if (!looksLikeGlbUpload(file.name, file.type)) {
    throw new Error("Only .glb uploads are supported for 3D badges.");
  }

  const arrayBuffer = await file.arrayBuffer();
  if (!isGlbHeader(arrayBuffer)) {
    throw new Error("This file is not a valid GLB asset.");
  }

  const { loader, dracoLoader } = createConfiguredGlbLoader();
  try {
    return await loader.parseAsync(arrayBuffer, window.location.origin + "/");
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Could not read this GLB file.",
    );
  } finally {
    dracoLoader.dispose();
  }
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

async function renderPosterFromGltf(
  gltf: GLTF,
  yaw: number,
  pitch: number,
  renderer: WebGLRenderer,
): Promise<Blob> {
  const scene = new Scene();
  setupBadgeModelScene(scene, renderer);
  configureBadgePosterRenderer(renderer);
  renderer.setClearColor(0x000000, 0);

  const model = cloneSkeleton(gltf.scene);
  centerBadgeModelAtOrigin(model);
  prepareBadgeModelMaterialsForPoster(model);
  const orbitRoot = new Group();
  orbitRoot.add(model);
  applyBadgeModelPose(orbitRoot, yaw, pitch);
  scene.add(orbitRoot);

  let mixer: AnimationMixer | null = null;
  if (gltf.animations[0]) {
    mixer = new AnimationMixer(model);
    const action = mixer.clipAction(gltf.animations[0]);
    action.setLoop(LoopRepeat, Infinity);
    action.play();
    mixer.setTime(0);
  }

  const camera = new PerspectiveCamera(34, 1, 0.01, 1000);
  frameCameraForBadgeModel(orbitRoot, camera);

  // Warm up IBL and advance the clip so the capture matches live 3D brightness.
  const warmupFrames = mixer ? 5 : 2;
  for (let frame = 0; frame < warmupFrames; frame += 1) {
    mixer?.update(1 / 30);
    renderer.render(scene, camera);
  }

  const blob = await canvasToPngBlob(renderer.domElement);

  mixer?.stopAllAction();
  disposeObject3D(orbitRoot);
  scene.clear();

  return blob;
}

export async function prepareBadgeModelUpload(
  file: File,
): Promise<PreparedBadgeModelUpload> {
  const gltf = await parseGlbFile(file);

  const renderer = getSharedPosterRenderer();
  const preset = BADGE_MODEL_POSE_PRESETS[0];
  const initialYaw = preset?.yaw ?? 0;
  const initialPitch = preset?.pitch ?? 0;
  const initialPreviewBlob = await renderPosterFromGltf(
    gltf,
    initialYaw,
    initialPitch,
    renderer,
  );
  const initialPreviewUrl = URL.createObjectURL(initialPreviewBlob);

  return {
    initialPreviewBlob,
    initialPreviewUrl,
    initialYaw,
    initialPitch,
    createPreviewBlob: (yaw, pitch) => renderPosterFromGltf(gltf, yaw, pitch, renderer),
  };
}

export async function renderBadgeModelPosterFromSignedUrl(args: {
  signedModelUrl: string;
  yaw: number;
  pitch: number;
}): Promise<Blob> {
  const { loader, dracoLoader } = createConfiguredGlbLoader();
  try {
    const gltf = await loader.loadAsync(args.signedModelUrl);
    const renderer = getSharedPosterRenderer();
    return await renderPosterFromGltf(gltf, args.yaw, args.pitch, renderer);
  } finally {
    dracoLoader.dispose();
  }
}
