"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D uImage;
uniform sampler2D uDisplacement;
uniform float uStrength;
uniform vec2 uCoverScale;
uniform vec2 uCoverOffset;
varying vec2 vUv;

const float PI = 3.141592653589793238;

void main() {
  float d = texture2D(uDisplacement, vUv).r;
  float theta = d * 2.0 * PI;
  vec2 dir = vec2(sin(theta), cos(theta));
  vec2 uv = vUv + dir * d * uStrength;
  vec2 imageUv = clamp(uCoverOffset + uv * uCoverScale, 0.0, 1.0);
  gl_FragColor = texture2D(uImage, imageUv);
}
`;

function createBrushTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.65, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export interface ImageRippleEffectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  className?: string;
  /** Image drawn and distorted inside the frame (object-fit: cover). */
  src: string;
  /** Matches CSS object-position, 0–1 per axis. */
  focusX?: number;
  focusY?: number;
  distortionStrength?: number;
  waveCount?: number;
  waveSize?: number;
  waveRotationSpeed?: number;
  waveFadeMultiplier?: number;
  waveGrowth?: number;
  waveSpawnThreshold?: number;
}

/**
 * Cursor-driven ripple: brush stamps paint a displacement map that refracts
 * the image. Waves only spawn when the cursor moves relative to the frame
 * (pointer movement, or scrolling while the cursor rests over it).
 */
export function ImageRippleEffect({
  className,
  src,
  focusX = 0.5,
  focusY = 0.5,
  distortionStrength = 0.075,
  waveCount = 100,
  waveSize = 60,
  waveRotationSpeed = 0.025,
  waveFadeMultiplier = 0.95,
  waveGrowth = 0.155,
  waveSpawnThreshold = 0.1,
  ...props
}: ImageRippleEffectProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    } catch {
      return;
    }
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    let width = Math.max(1, container.offsetWidth);
    let height = Math.max(1, container.offsetHeight);

    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      -1000,
      1000,
    );
    camera.position.z = 2;

    const displacementTarget = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: false,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
    });

    const brushTexture = createBrushTexture();
    const rippleScene = new THREE.Scene();
    const waveGeometry = new THREE.PlaneGeometry(waveSize, waveSize);
    const waves: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] =
      [];
    for (let i = 0; i < waveCount; i += 1) {
      const mesh = new THREE.Mesh(
        waveGeometry,
        new THREE.MeshBasicMaterial({
          map: brushTexture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        }),
      );
      mesh.visible = false;
      rippleScene.add(mesh);
      waves.push(mesh);
    }

    const uniforms = {
      uImage: { value: null as THREE.Texture | null },
      uDisplacement: { value: displacementTarget.texture },
      uStrength: { value: distortionStrength },
      uCoverScale: { value: new THREE.Vector2(1, 1) },
      uCoverOffset: { value: new THREE.Vector2(0, 0) },
    };
    const screenScene = new THREE.Scene();
    const screenGeometry = new THREE.PlaneGeometry(1, 1);
    const screenMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screenScene.add(screen);

    let imageAspect = 1;
    const updateCover = () => {
      const frameAspect = width / height;
      let sx = 1;
      let sy = 1;
      if (imageAspect > frameAspect) sx = frameAspect / imageAspect;
      else sy = imageAspect / frameAspect;
      // UV v runs bottom→top; object-position Y runs top→bottom.
      uniforms.uCoverScale.value.set(sx, sy);
      uniforms.uCoverOffset.value.set((1 - sx) * focusX, (1 - sy) * (1 - focusY));
    };

    const resize = () => {
      width = Math.max(1, container.offsetWidth);
      height = Math.max(1, container.offsetHeight);
      renderer.setSize(width, height, false);
      const pr = renderer.getPixelRatio();
      displacementTarget.setSize(
        Math.round(width * pr),
        Math.round(height * pr),
      );
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      screen.scale.set(width, height, 1);
      updateCover();
      requestRender();
    };

    let disposed = false;
    let imageTexture: THREE.Texture | null = null;
    new THREE.TextureLoader().load(src, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      const img = texture.image as { width: number; height: number };
      imageAspect = img.width / Math.max(img.height, 1);
      imageTexture = texture;
      uniforms.uImage.value = texture;
      updateCover();
      requestRender();
      setReady(true);
    });

    // Pointer in frame pixels, tracked from the last known client position so
    // scrolling with a resting cursor still moves it across the photo.
    let clientX = Number.NaN;
    let clientY = Number.NaN;
    let prev = { x: Number.NaN, y: Number.NaN };
    let currentWave = 0;

    const sample = () => {
      if (!Number.isFinite(clientX)) return;
      const rect = container.getBoundingClientRect();
      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      if (!inside || rect.width < 1 || rect.height < 1) {
        prev = { x: Number.NaN, y: Number.NaN };
        return;
      }
      const px = ((clientX - rect.left) / rect.width) * width;
      const py = ((clientY - rect.top) / rect.height) * height;
      const x = px - width / 2;
      const y = height / 2 - py;
      const firstContact = !Number.isFinite(prev.x);
      const moved =
        firstContact ||
        Math.abs(x - prev.x) > waveSpawnThreshold ||
        Math.abs(y - prev.y) > waveSpawnThreshold;
      prev = { x, y };
      if (!moved) return;

      const mesh = waves[currentWave];
      currentWave = (currentWave + 1) % waves.length;
      if (!mesh) return;
      mesh.position.set(x, y, 0);
      mesh.scale.set(1.75, 1.75, 1);
      mesh.rotation.z = Math.random() * Math.PI;
      mesh.material.opacity = 1;
      mesh.visible = true;
      requestRender();
    };

    const onPointerMove = (event: PointerEvent) => {
      clientX = event.clientX;
      clientY = event.clientY;
    };
    // Touch has no hover — stamp as soon as a finger lands / drags over the photo.
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      clientX = event.clientX;
      clientY = event.clientY;
      prev = { x: Number.NaN, y: Number.NaN };
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      clientX = Number.NaN;
      clientY = Number.NaN;
      prev = { x: Number.NaN, y: Number.NaN };
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    let raf = 0;
    let renderQueued = false;
    function requestRender() {
      renderQueued = true;
    }

    const tick = () => {
      raf = requestAnimationFrame(tick);
      sample();

      let active = false;
      for (const mesh of waves) {
        if (!mesh.visible) continue;
        active = true;
        mesh.rotation.z += waveRotationSpeed;
        mesh.scale.x = 0.98 * mesh.scale.x + waveGrowth;
        mesh.scale.y = 0.98 * mesh.scale.y + waveGrowth;
        mesh.material.opacity *= waveFadeMultiplier;
        if (mesh.material.opacity <= 0.01) mesh.visible = false;
      }

      if (!imageTexture || (!active && !renderQueued)) return;
      renderQueued = active;

      renderer.setRenderTarget(displacementTarget);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(rippleScene, camera);

      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(screenScene, camera);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("touchmove", onTouchMove);
      waves.forEach((mesh) => mesh.material.dispose());
      waveGeometry.dispose();
      brushTexture.dispose();
      screenGeometry.dispose();
      screenMaterial.dispose();
      displacementTarget.dispose();
      imageTexture?.dispose();
      renderer.dispose();
      canvas.remove();
      setReady(false);
    };
  }, [
    src,
    focusX,
    focusY,
    distortionStrength,
    waveCount,
    waveSize,
    waveRotationSpeed,
    waveFadeMultiplier,
    waveGrowth,
    waveSpawnThreshold,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none overflow-hidden transition-opacity duration-300",
        ready ? "opacity-100" : "opacity-0",
        className,
      )}
      {...props}
    />
  );
}
