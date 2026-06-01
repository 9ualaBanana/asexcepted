import {
  Light,
  Mesh,
  MeshPhysicalMaterial,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

const KHR_LIGHTS_PUNCTUAL = "KHR_lights_punctual";
const KHR_TRANSMISSION = "KHR_materials_transmission";
const KHR_EMISSIVE_STRENGTH = "KHR_materials_emissive_strength";
const KHR_DISPERSION = "KHR_materials_dispersion";

const PUNCTUAL_LIGHT_INTENSITY_SCALE = 1.2;

type GltfJson = {
  extensionsUsed?: string[];
};

export type BadgeModelGltfTuningProfile = {
  hasPunctualLights: boolean;
  hasTransmission: boolean;
  hasEmissiveStrength: boolean;
  hasDispersion: boolean;
  lightCount: number;
  tunedMaterialCount: number;
};

function getGltfJson(gltf: GLTF): GltfJson | null {
  const parser = (gltf as GLTF & { parser?: { json?: GltfJson } }).parser;
  return parser?.json ?? null;
}

function usesExtension(json: GltfJson | null, extensionName: string): boolean {
  return json?.extensionsUsed?.includes(extensionName) ?? false;
}

function tunePhysicalMaterial(
  material: MeshPhysicalMaterial,
  profile: BadgeModelGltfTuningProfile,
): boolean {
  let envBoost = 1;

  if (profile.hasTransmission && material.transmission > 0) {
    envBoost = Math.max(envBoost, 2.25);
  }
  if (profile.hasDispersion && (material.dispersion ?? 0) > 0) {
    envBoost = Math.max(envBoost, 1.85);
  }
  if (profile.hasEmissiveStrength && material.emissiveIntensity > 1) {
    envBoost = Math.max(envBoost, 1.65);
  }
  if (material.emissive.getHex() !== 0) {
    envBoost = Math.max(envBoost, 1.45);
  }

  if (envBoost <= 1) {
    return false;
  }

  material.envMapIntensity = Math.max(material.envMapIntensity, envBoost);
  material.needsUpdate = true;
  return true;
}

function enablePunctualLights(root: Object3D): number {
  let lightCount = 0;
  root.traverse((object) => {
    if (!(object instanceof Light)) return;
    object.visible = true;
    object.intensity *= PUNCTUAL_LIGHT_INTENSITY_SCALE;
    lightCount += 1;
  });
  return lightCount;
}

function applySceneExposureTuning(
  profile: BadgeModelGltfTuningProfile,
  scene: Scene,
  renderer: WebGLRenderer,
): void {
  const baseEnvIntensity = Number(
    process.env.NEXT_PUBLIC_BADGE_MODEL_ENVIRONMENT_INTENSITY,
  );
  const baseExposure = Number(
    process.env.NEXT_PUBLIC_BADGE_MODEL_TONE_MAPPING_EXPOSURE,
  );

  let envScale = 1;
  let exposureScale = 1;

  if (profile.hasTransmission) {
    envScale = Math.max(envScale, 1.35);
    exposureScale = Math.max(exposureScale, 1.12);
  }
  if (profile.hasDispersion) {
    envScale = Math.max(envScale, 1.18);
  }
  if (profile.hasEmissiveStrength) {
    exposureScale = Math.max(exposureScale, 1.08);
  }
  if (profile.hasPunctualLights && profile.lightCount > 0) {
    envScale = Math.max(envScale, 1.1);
  }

  scene.environmentIntensity = baseEnvIntensity * envScale;
  renderer.toneMappingExposure = baseExposure * exposureScale;
}

/**
 * Activates glTF lighting/material extensions after clone: punctual lights,
 * envMapIntensity on glass/emissive meshes, bounded scene IBL/exposure bump.
 */
export function applyBadgeModelGltfTuning(
  gltf: GLTF,
  root: Object3D,
  context: { scene: Scene; renderer: WebGLRenderer },
): BadgeModelGltfTuningProfile {
  const json = getGltfJson(gltf);

  const profile: BadgeModelGltfTuningProfile = {
    hasPunctualLights: usesExtension(json, KHR_LIGHTS_PUNCTUAL),
    hasTransmission: usesExtension(json, KHR_TRANSMISSION),
    hasEmissiveStrength: usesExtension(json, KHR_EMISSIVE_STRENGTH),
    hasDispersion: usesExtension(json, KHR_DISPERSION),
    lightCount: 0,
    tunedMaterialCount: 0,
  };

  if (profile.hasPunctualLights) {
    profile.lightCount = enablePunctualLights(root);
  }

  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    for (const material of materials) {
      if (!(material instanceof MeshPhysicalMaterial)) continue;
      if (tunePhysicalMaterial(material, profile)) {
        profile.tunedMaterialCount += 1;
      }
    }
  });

  context.scene.environmentIntensity = Number(
    process.env.NEXT_PUBLIC_BADGE_MODEL_ENVIRONMENT_INTENSITY,
  );
  context.renderer.toneMappingExposure = Number(
    process.env.NEXT_PUBLIC_BADGE_MODEL_TONE_MAPPING_EXPOSURE,
  );

  const needsSceneTuning =
    profile.hasTransmission ||
    profile.hasDispersion ||
    profile.hasEmissiveStrength ||
    profile.lightCount > 0;

  if (needsSceneTuning) {
    applySceneExposureTuning(profile, context.scene, context.renderer);
  }

  return profile;
}
