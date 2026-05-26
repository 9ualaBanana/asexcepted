"use client";

import {
  ACESFilmicToneMapping,
  AnimationMixer,
  LoopRepeat,
  PerspectiveCamera,
  Quaternion,
  SRGBColorSpace,
  Scene,
  WebGLRenderer,
  type KeyframeTrack,
} from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import {
  BADGE_MODEL_MAX_FILE_BYTES,
  isGlbHeader,
  looksLikeGlbUpload,
} from "@/lib/achievements/badge-assets";
import {
  addBadgeModelLights,
  configureBadgeModelLoader,
  frameBadgeModelForCamera,
} from "@/lib/achievements/badge-model-rendering";

const PREVIEW_SIZE_PX = 768;
const LOOP_EPSILON = 0.025;
const LOOP_QUATERNION_EPSILON_RAD = 0.06;
export type PreparedBadgeModelUpload = {
  previewBlob: Blob;
};

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

function isNumericTrackLoopable(track: KeyframeTrack): boolean {
  const times = track.times;
  const values = track.values;
  if (times.length < 2) return true;

  const stride = values.length / times.length;
  if (!Number.isFinite(stride) || stride <= 0) return false;

  const first = Array.from(values.slice(0, stride));
  const last = Array.from(values.slice(values.length - stride));

  if (track.name.endsWith(".quaternion") && stride >= 4) {
    const qa = new Quaternion(first[0] ?? 0, first[1] ?? 0, first[2] ?? 0, first[3] ?? 1);
    const qb = new Quaternion(last[0] ?? 0, last[1] ?? 0, last[2] ?? 0, last[3] ?? 1);
    qa.normalize();
    qb.normalize();

    const same = qa.angleTo(qb) <= LOOP_QUATERNION_EPSILON_RAD;
    const qbNegated = new Quaternion(-qb.x, -qb.y, -qb.z, -qb.w);
    const negated = qa.angleTo(qbNegated) <= LOOP_QUATERNION_EPSILON_RAD;
    return same || negated;
  }

  for (let i = 0; i < stride; i += 1) {
    if (Math.abs((first[i] ?? 0) - (last[i] ?? 0)) > LOOP_EPSILON) {
      return false;
    }
  }

  return true;
}

function validateFirstClipLoops(gltf: GLTF): void {
  const clip = gltf.animations[0];
  if (!clip) return;

  const isLoopable = clip.tracks.every((track) => isNumericTrackLoopable(track));
  if (!isLoopable) {
    throw new Error(
      "The first animation clip does not loop seamlessly. Please export the GLB with a clean looping clip as clip 0.",
    );
  }
}

async function renderPosterFromGltf(gltf: GLTF): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(PREVIEW_SIZE_PX, PREVIEW_SIZE_PX, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  addBadgeModelLights(scene);

  const model = cloneSkeleton(gltf.scene);
  scene.add(model);

  if (gltf.animations[0]) {
    const mixer = new AnimationMixer(model);
    const action = mixer.clipAction(gltf.animations[0]);
    action.setLoop(LoopRepeat, Infinity);
    action.play();
    mixer.setTime(0);
  }

  const camera = new PerspectiveCamera(34, 1, 0.01, 1000);
  frameBadgeModelForCamera(model, camera);

  renderer.render(scene, camera);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png");
  });

  renderer.dispose();

  if (!blob) {
    throw new Error("Could not generate a badge preview from this model.");
  }

  return blob;
}

export async function prepareBadgeModelUpload(
  file: File,
): Promise<PreparedBadgeModelUpload> {
  const gltf = await parseGlbFile(file);
  validateFirstClipLoops(gltf);
  const previewBlob = await renderPosterFromGltf(gltf);
  return { previewBlob };
}
