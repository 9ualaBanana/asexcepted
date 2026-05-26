"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  AnimationMixer,
  Group,
  LoopRepeat,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import {
  addBadgeModelLights,
  configureBadgeModelLoader,
  frameBadgeModelForCamera,
} from "@/lib/achievements/badge-model-rendering";
import { getCachedBadgeMotionStyle } from "@/lib/badge/render-cache";
import { cn } from "@/lib/utils";

type AchievementBadgeModelViewerProps = {
  signedModelUrl: string;
  previewSrc: string;
  className?: string;
  float?: boolean;
  motionSeed?: string;
  motionStartCentered?: boolean;
  onVisualReady?: () => void;
  stateKey?: string;
};

function configureGlbLoader(loader: GLTFLoader) {
  configureBadgeModelLoader(loader);
}

const MAX_PITCH_RAD = Math.PI / 2.2;
const DRAG_YAW_SENSITIVITY = 0.0072;
const DRAG_PITCH_SENSITIVITY = 0.0054;
const INERTIA_DAMPING = 0.915;
const INERTIA_MIN_SPEED = 0.00035;

const badgeModelViewStateCache = new Map<
  string,
  {
    yaw: number;
    pitch: number;
    inertiaYaw: number;
    inertiaPitch: number;
  }
>();

let sharedBadgeModelRenderer: WebGLRenderer | null = null;

function getSharedBadgeModelRenderer(): WebGLRenderer {
  if (sharedBadgeModelRenderer) {
    return sharedBadgeModelRenderer;
  }

  sharedBadgeModelRenderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  sharedBadgeModelRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  sharedBadgeModelRenderer.outputColorSpace = SRGBColorSpace;
  sharedBadgeModelRenderer.toneMapping = ACESFilmicToneMapping;
  sharedBadgeModelRenderer.setClearColor(0x000000, 0);
  sharedBadgeModelRenderer.domElement.style.width = "100%";
  sharedBadgeModelRenderer.domElement.style.height = "100%";
  sharedBadgeModelRenderer.domElement.style.display = "block";
  return sharedBadgeModelRenderer;
}

function disposeMaterial(value: unknown) {
  if (!value || typeof value !== "object" || !("dispose" in value)) return;
  const disposer = value.dispose;
  if (typeof disposer === "function") {
    disposer.call(value);
  }
}

export function AchievementBadgeModelViewer({
  signedModelUrl,
  previewSrc,
  className,
  float = false,
  motionSeed,
  motionStartCentered = false,
  onVisualReady,
  stateKey,
}: AchievementBadgeModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(true);
  const viewStateKey = useMemo(
    () => (stateKey ?? motionSeed ?? signedModelUrl).trim() || signedModelUrl,
    [motionSeed, signedModelUrl, stateKey],
  );

  useEffect(() => {
    setReady(false);
    setPreviewVisible(true);
  }, [signedModelUrl]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let frameId = 0;
    let renderer: WebGLRenderer | null = null;
    let mixer: AnimationMixer | null = null;
    let lastFrameTime = performance.now();
    let interactiveRoot: Group | null = null;
    let dragPointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    const cachedState = motionStartCentered
      ? undefined
      : badgeModelViewStateCache.get(viewStateKey);
    let inertiaYaw = cachedState?.inertiaYaw ?? 0;
    let inertiaPitch = cachedState?.inertiaPitch ?? 0;
    let yaw = cachedState?.yaw ?? 0;
    let pitch = cachedState?.pitch ?? 0;
    let allowAnimationAdvance = false;
    let animationStartTimeout: number | null = null;
    let previewFadeTimeout: number | null = null;

    const loader = new GLTFLoader();
    configureGlbLoader(loader);

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.01, 1000);
    addBadgeModelLights(scene);

    const handleResize = () => {
      if (!renderer) return;
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const applyRotation = () => {
      if (!interactiveRoot) return;
      interactiveRoot.rotation.x = pitch;
      interactiveRoot.rotation.y = yaw;
      badgeModelViewStateCache.set(viewStateKey, {
        yaw,
        pitch,
        inertiaYaw,
        inertiaPitch,
      });
    };

    const beginDrag = (pointerId: number, clientX: number, clientY: number) => {
      dragPointerId = pointerId;
      lastX = clientX;
      lastY = clientY;
      inertiaYaw = 0;
      inertiaPitch = 0;
    };

    const updateDrag = (clientX: number, clientY: number) => {
      if (dragPointerId == null) return;
      const dx = clientX - lastX;
      const dy = clientY - lastY;
      lastX = clientX;
      lastY = clientY;
      inertiaYaw = dx * DRAG_YAW_SENSITIVITY;
      inertiaPitch = dy * DRAG_PITCH_SENSITIVITY;
      yaw += inertiaYaw;
      pitch = Math.max(-MAX_PITCH_RAD, Math.min(MAX_PITCH_RAD, pitch + inertiaPitch));
      applyRotation();
    };

    const endDrag = () => {
      dragPointerId = null;
    };

    const onPointerDown = (event: PointerEvent) => {
      mount.setPointerCapture(event.pointerId);
      beginDrag(event.pointerId, event.clientX, event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragPointerId !== event.pointerId) return;
      updateDrag(event.clientX, event.clientY);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (dragPointerId !== event.pointerId) return;
      if (mount.hasPointerCapture(event.pointerId)) {
        mount.releasePointerCapture(event.pointerId);
      }
      endDrag();
    };

    mount.addEventListener("pointerdown", onPointerDown);
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerup", onPointerUp);
    mount.addEventListener("pointercancel", onPointerUp);
    mount.addEventListener("pointerleave", onPointerUp);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    renderer = getSharedBadgeModelRenderer();
    if (renderer.domElement.parentNode && renderer.domElement.parentNode !== mount) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    mount.appendChild(renderer.domElement);
    handleResize();

    const animate = (time: number) => {
      if (cancelled || !renderer) return;
      frameId = requestAnimationFrame(animate);
      const deltaSeconds = Math.min((time - lastFrameTime) / 1000, 0.05);
      lastFrameTime = time;

      if (dragPointerId == null && interactiveRoot) {
        inertiaYaw *= INERTIA_DAMPING;
        inertiaPitch *= INERTIA_DAMPING;
        if (Math.abs(inertiaYaw) + Math.abs(inertiaPitch) >= INERTIA_MIN_SPEED) {
          yaw += inertiaYaw;
          pitch = Math.max(-MAX_PITCH_RAD, Math.min(MAX_PITCH_RAD, pitch + inertiaPitch));
          applyRotation();
        }
      }

      if (allowAnimationAdvance) {
        mixer?.update(deltaSeconds);
      }
      renderer.render(scene, camera);
    };

    void loader
      .loadAsync(signedModelUrl)
      .then((gltf) => {
        if (cancelled) return;

        interactiveRoot = new Group();
        const model = cloneSkeleton(gltf.scene);
        interactiveRoot.add(model);
        scene.add(interactiveRoot);
        interactiveRoot.updateMatrixWorld(true);

        frameBadgeModelForCamera(model, camera);

        if (gltf.animations[0]) {
          mixer = new AnimationMixer(model);
          const action = mixer.clipAction(gltf.animations[0]);
          action.reset();
          action.setLoop(LoopRepeat, Infinity);
          action.play();
          mixer.setTime(0);
        }

        applyRotation();

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (cancelled) return;
            setReady(true);
            onVisualReady?.();
            previewFadeTimeout = window.setTimeout(() => {
              setPreviewVisible(false);
            }, 90);
            animationStartTimeout = window.setTimeout(() => {
              allowAnimationAdvance = true;
            }, 140);
          });
        });
      })
      .catch(() => {
        /* Keep the generated preview visible if model loading fails. */
      });

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      if (animationStartTimeout !== null) {
        window.clearTimeout(animationStartTimeout);
      }
      if (previewFadeTimeout !== null) {
        window.clearTimeout(previewFadeTimeout);
      }
      resizeObserver.disconnect();
      mount.removeEventListener("pointerdown", onPointerDown);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerup", onPointerUp);
      mount.removeEventListener("pointercancel", onPointerUp);
      mount.removeEventListener("pointerleave", onPointerUp);
      mixer?.stopAllAction();
      badgeModelViewStateCache.set(viewStateKey, {
        yaw,
        pitch,
        inertiaYaw,
        inertiaPitch,
      });
      interactiveRoot?.traverse((object) => {
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
      scene.clear();
      if (renderer?.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [motionStartCentered, onVisualReady, signedModelUrl, viewStateKey]);

  const floatMotionStyle = useMemo(
    () =>
      float
        ? getCachedBadgeMotionStyle(
            (motionSeed ?? signedModelUrl).trim() || "badge-model",
            motionStartCentered,
          )
        : undefined,
    [float, motionSeed, motionStartCentered, signedModelUrl],
  );

  const viewer = (
    <div className={cn("relative h-full w-full", className)}>
      <div className="relative h-full w-full p-1">
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-10 transition-opacity duration-200",
            previewVisible ? "opacity-100" : "opacity-0",
          )}
        >
          <RemoteBadgeImage src={previewSrc} className="h-full w-full object-contain" />
        </div>
        <div
          ref={mountRef}
          className={cn(
            "h-full w-full touch-none transition-opacity duration-300",
            !ready && "opacity-0",
          )}
        />
      </div>
    </div>
  );

  if (!float) return viewer;

  return (
    <div className="relative h-full w-full">
      <div
        className="relative h-full w-full achievement-badge-object-float"
        style={floatMotionStyle}
      >
        {viewer}
      </div>
    </div>
  );
}
