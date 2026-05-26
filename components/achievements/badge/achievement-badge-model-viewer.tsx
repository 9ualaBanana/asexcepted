"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  AnimationMixer,
  Box3,
  DirectionalLight,
  Group,
  LoopRepeat,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import { getCachedBadgeMotionStyle } from "@/lib/badge/render-cache";
import { cn } from "@/lib/utils";

const DRACO_DECODER_CDN = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

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
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_DECODER_CDN);
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);
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
  const viewStateKey = useMemo(
    () => (stateKey ?? motionSeed ?? signedModelUrl).trim() || signedModelUrl,
    [motionSeed, signedModelUrl, stateKey],
  );

  useEffect(() => {
    setReady(false);
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
    const cachedState = badgeModelViewStateCache.get(viewStateKey);
    let inertiaYaw = cachedState?.inertiaYaw ?? 0;
    let inertiaPitch = cachedState?.inertiaPitch ?? 0;
    let yaw = cachedState?.yaw ?? 0;
    let pitch = cachedState?.pitch ?? 0;

    const loader = new GLTFLoader();
    configureGlbLoader(loader);

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.01, 1000);
    const ambientLight = new AmbientLight(0xffffff, 1.8);
    const keyLight = new DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(6, 8, 10);
    const fillLight = new DirectionalLight(0xc7d2fe, 1.1);
    fillLight.position.set(-8, 4, 6);
    scene.add(ambientLight, keyLight, fillLight);

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

    renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
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

      mixer?.update(deltaSeconds);
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

        const box = new Box3().setFromObject(interactiveRoot);
        const center = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        model.position.sub(center);
        model.updateMatrixWorld(true);

        const distance = maxDim * 2.35;
        camera.position.set(maxDim * 0.34, Math.max(size.y * 0.22, 0.22), distance);
        camera.near = Math.max(distance / 200, 0.01);
        camera.far = distance * 12;
        camera.lookAt(0, Math.max(size.y * 0.05, 0), 0);
        camera.updateProjectionMatrix();

        if (gltf.animations[0]) {
          mixer = new AnimationMixer(model);
          const action = mixer.clipAction(gltf.animations[0]);
          action.reset();
          action.setLoop(LoopRepeat, Infinity);
          action.play();
        }

        applyRotation();

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (cancelled) return;
            setReady(true);
            onVisualReady?.();
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
      renderer?.dispose();
      if (renderer?.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [onVisualReady, signedModelUrl, viewStateKey]);

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
      {!ready ? (
        <div className="pointer-events-none absolute inset-0 z-10">
          <RemoteBadgeImage src={previewSrc} className="h-full w-full object-contain p-1" />
        </div>
      ) : null}
      <div
        ref={mountRef}
        className={cn(
          "h-full w-full touch-none transition-opacity duration-300",
          !ready && "opacity-0",
        )}
      />
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
