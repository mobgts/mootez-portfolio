"use client";

/* eslint-disable react/no-unknown-property */

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  WebGLErrorBoundary,
  WebGLFallback,
} from "@/components/ui/webgl-error-boundary";
import { cn } from "@/lib/utils";
import {
  DoubleSide,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  NoColorSpace,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderTarget,
} from "three";
import {
  Suspense,
  type MutableRefObject,
  type WheelEvent,
  useEffect,
  useMemo,
  useRef,
} from "react";

export interface Spiral3DSlide {
  /** Image source rendered inside the slide. */
  src: string;
  /** Accessible description for the image. */
  alt: string;
}

export interface Spiral3DSliderProps {
  /** Images arranged along the spiral. */
  items: Spiral3DSlide[];
  /** Additional classes for the WebGL stage. */
  className?: string;
  /** Maximum horizontal radius of the spiral in pixels. */
  radius?: number;
  /** Vertical distance between neighboring images in pixels. */
  verticalGap?: number;
  /** Maximum width of every image plane in pixels. */
  cardWidth?: number;
  /** Width divided by height for every image plane. */
  cardAspectRatio?: number;
  /** Whether the spiral advances automatically while idle. */
  autoRotate?: boolean;
  /** Automatic movement in slides per second. */
  autoSpeed?: number;
  /** Amount of scroll required to move along the spiral. */
  scrollSensitivity?: number;
  /** Motion smoothing between 0 and 1. */
  smoothing?: number;
  /** Amount each image plane bends into the spiral. */
  bend?: number;
  /** Perspective camera field of view in degrees. */
  fov?: number;
  /** Accessible name for the gallery region. */
  ariaLabel?: string;
}

const vertexShader = `
  uniform float uBend;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    float curve = 1.0 - cos(position.x * 3.14159265);
    transformed.z -= curve * uBend;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uImageAspect;
  uniform float uPlaneAspect;
  uniform float uOpacity;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv) {
    vec2 scale = vec2(1.0);
    if (uImageAspect > uPlaneAspect) {
      scale.x = uPlaneAspect / uImageAspect;
    } else {
      scale.y = uImageAspect / uPlaneAspect;
    }
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    vec4 color = texture2D(uTexture, coverUv(vUv));
    gl_FragColor = vec4(color.rgb, color.a * uOpacity);
  }
`;

/** Liquid-glass rim that bends photos as they dissolve into the upper and lower corners. */
const GLASS = {
  /** Lens ellipse half-size in stage UV; taller than the stage so its rim crosses all four corners. */
  sizeX: 0.4,
  sizeY: 0.62,
  /** Vertical distance from the stage centre (UV) where the glass starts, and where it is full. */
  zoneStart: 0.05,
  zoneFull: 0.2,
  /** Share of the stage height, at the top and at the bottom, over which photos thin out to nothing. */
  edgeFade: 0.15,
  rimStart: 0.6,
  tangential: 0.12,
  dispersion: 11,
  samples: 12,
  ring: 2.6,
  ringAura: 0.4,
  ringRadius: 0.49,
  ringWidth: 0.014,
  rimLine: 1.2,
  rimLinePos: 0.488,
  rimLineWidth: 0.003,
  shimmerFreq: 12,
  shimmerSpeed: 3.5,
  shimmerDepth: 0.12,
  waveSpeed: 0.6,
};

const ACCENT_REFRESH_FRAMES = 12;

const glassVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const f = (value: number) => value.toFixed(4);

// The render target holds premultiplied colour, so every mix and add stays premultiplied.
const glassFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec3 uAccent;
  uniform float uTime;
  uniform float uMotion;

  const int SAMPLES = ${GLASS.samples};

  void main() {
    vec4 base = texture2D(uTexture, vUv);
    float edgeFade =
      smoothstep(0.0, ${f(GLASS.edgeFade)}, vUv.y) *
      smoothstep(0.0, ${f(GLASS.edgeFade)}, 1.0 - vUv.y);

    vec2 offset = vUv - 0.5;
    vec2 p = offset / vec2(${f(GLASS.sizeX)}, ${f(GLASS.sizeY)});
    float nd = length(p);
    float zone = smoothstep(${f(GLASS.zoneStart)}, ${f(GLASS.zoneFull)}, abs(offset.y));
    float amount = zone * smoothstep(1.0, 0.93, nd);
    if (amount < 0.001) {
      gl_FragColor = base * edgeFade;
      return;
    }

    vec2 radialDir = normalize(offset + 1e-6);
    vec2 tangentDir = vec2(-radialDir.y, radialDir.x);
    float angle = atan(p.y, p.x);
    float rim = smoothstep(${f(GLASS.rimStart)}, 1.0, nd);
    float drift = uTime * ${f(GLASS.waveSpeed)} * uMotion;
    float wave = sin(angle * 2.0 + drift) * 0.55 + sin(angle - drift * 0.5) * 0.25;
    vec2 baseUv = vUv + tangentDir * wave * rim * ${f(GLASS.tangential)};

    vec2 dispDir = offset * ${f(GLASS.dispersion * 0.004)} * smoothstep(0.55, 1.0, nd);
    vec3 rgb = vec3(0.0);
    vec3 rgbWeight = vec3(0.0);
    float alpha = 0.0;
    float alphaWeight = 0.0;
    for (int i = 0; i < SAMPLES; i++) {
      float t = float(i) / float(SAMPLES - 1);
      vec4 s = texture2D(uTexture, baseUv + dispDir * (t - 0.5));
      vec3 w = vec3(
        exp(-pow(t / 0.38, 2.0)),
        exp(-pow((t - 0.5) / 0.38, 2.0)),
        exp(-pow((t - 1.0) / 0.38, 2.0))
      );
      float wa = (w.r + w.g + w.b) / 3.0;
      rgb += s.rgb * w;
      rgbWeight += w;
      alpha += s.a * wa;
      alphaWeight += wa;
    }
    vec4 glass = vec4(rgb / max(rgbWeight, vec3(0.001)), alpha / max(alphaWeight, 0.001));
    vec4 color = mix(base, glass, amount);

    float dC = nd * 0.5;
    float ring = exp(-pow((dC - ${f(GLASS.ringRadius)}) / ${f(GLASS.ringWidth)}, 2.0)) * ${f(GLASS.ring)};
    ring *= mix(1.0, sin(angle * ${f(GLASS.shimmerFreq)} + uTime * ${f(GLASS.shimmerSpeed)}) * ${f(GLASS.shimmerDepth)} + ${f(1 - GLASS.shimmerDepth)}, uMotion);
    float aura = exp(-pow((dC - ${f(GLASS.ringRadius)}) / ${f(GLASS.ringWidth * 6)}, 2.0)) * ${f(GLASS.ringAura)};
    float line = exp(-pow((dC - ${f(GLASS.rimLinePos)}) / ${f(GLASS.rimLineWidth)}, 2.0)) * ${f(GLASS.rimLine)};
    vec3 glow = uAccent * (ring + aura) + vec3(line);

    // Light only lands where a photo is, never on the empty page behind the spiral.
    color.rgb += glow * zone * color.a;
    color.rgb = min(color.rgb, vec3(color.a));
    gl_FragColor = color * edgeFade;
  }
`;

function readAccent(target: Vector3) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    "--lavender",
  );
  const channels = value.match(/[\d.]+/g);
  if (!channels || channels.length < 3) return;
  target.set(
    Number(channels[0]) / 255,
    Number(channels[1]) / 255,
    Number(channels[2]) / 255,
  );
}

function GlassEdgePass({
  reducedMotion,
}: {
  reducedMotion: MutableRefObject<boolean>;
}) {
  const { gl, scene, camera, size, viewport } = useThree();
  const accentCountdownRef = useRef(0);
  const passRef = useRef<ReturnType<typeof createGlassPass> | null>(null);
  const width = Math.max(1, Math.round(size.width * viewport.dpr));
  const height = Math.max(1, Math.round(size.height * viewport.dpr));

  useEffect(() => {
    const pass = createGlassPass();
    passRef.current = pass;
    return () => {
      passRef.current = null;
      pass.target.dispose();
      pass.material.dispose();
      pass.quad.geometry.dispose();
    };
  }, []);

  useEffect(() => {
    passRef.current?.target.setSize(width, height);
  }, [width, height]);

  useFrame((state) => {
    const pass = passRef.current;
    if (!pass) {
      gl.render(scene, camera);
      return;
    }
    if (pass.target.width !== width || pass.target.height !== height) {
      pass.target.setSize(width, height);
    }
    const uniforms = pass.material.uniforms;
    accentCountdownRef.current -= 1;
    if (accentCountdownRef.current <= 0) {
      accentCountdownRef.current = ACCENT_REFRESH_FRAMES;
      readAccent(uniforms.uAccent!.value as Vector3);
    }
    uniforms.uTime!.value = state.clock.elapsedTime;
    uniforms.uMotion!.value = reducedMotion.current ? 0 : 1;

    gl.setRenderTarget(pass.target);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(pass.scene, pass.camera);
  }, 1);

  return null;
}

function createGlassPass() {
  const target = new WebGLRenderTarget(1, 1, { samples: 4 });
  const material = new ShaderMaterial({
    uniforms: {
      uTexture: { value: target.texture },
      uAccent: { value: new Vector3(0.78, 0.72, 0.58) },
      uTime: { value: 0 },
      uMotion: { value: 1 },
    },
    vertexShader: glassVertexShader,
    fragmentShader: glassFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);
  return {
    target,
    material,
    quad,
    scene,
    camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
  };
}

function wrappedPosition(value: number, length: number) {
  const wrapped = ((value % length) + length) % length;
  return wrapped > length / 2 ? wrapped - length : wrapped;
}

function imageAspect(texture: Texture) {
  const image = texture.image as
    | {
        naturalWidth?: number;
        naturalHeight?: number;
        width?: number;
        height?: number;
      }
    | undefined;
  const width = image?.naturalWidth ?? image?.width ?? 1;
  const height = image?.naturalHeight ?? image?.height ?? 1;
  return width / Math.max(height, 1);
}

interface SpiralSceneProps {
  items: Spiral3DSlide[];
  targetProgress: MutableRefObject<number>;
  radius: number;
  verticalGap: number;
  cardWidth: number;
  cardAspectRatio: number;
  autoRotate: boolean;
  autoSpeed: number;
  smoothing: number;
  bend: number;
  reducedMotion: MutableRefObject<boolean>;
  lastInteraction: MutableRefObject<number>;
}

function SpiralScene({
  items,
  targetProgress,
  radius,
  verticalGap,
  cardWidth,
  cardAspectRatio,
  autoRotate,
  autoSpeed,
  smoothing,
  bend,
  reducedMotion,
  lastInteraction,
}: SpiralSceneProps) {
  const sceneItems = useMemo(
    () =>
      Array.from(
        { length: Math.max(items.length, 16) },
        (_, index) => items[index % items.length]!,
      ),
    [items],
  );
  const textures = useLoader(
    TextureLoader,
    sceneItems.map((item) => item.src),
  );
  const { gl, viewport } = useThree();
  const progress = useRef(0);
  const meshes = useRef<(Mesh | null)[]>([]);
  const materials = useRef<(ShaderMaterial | null)[]>([]);

  const uniforms = useMemo(
    () =>
      textures.map((texture) => ({
        uTexture: { value: texture },
        uImageAspect: { value: imageAspect(texture) },
        uPlaneAspect: { value: cardAspectRatio },
        uBend: { value: 0 },
        uOpacity: { value: 1 },
      })),
    [cardAspectRatio, textures],
  );

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = NoColorSpace;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      texture.needsUpdate = true;
    });
  }, [gl, textures]);

  useFrame((_state, delta) => {
    if (
      autoRotate &&
      !reducedMotion.current &&
      performance.now() - lastInteraction.current > 450
    ) {
      targetProgress.current += autoSpeed * Math.min(delta, 0.05);
    }

    const frameScale = Math.min(delta * 60, 3);
    const ease = reducedMotion.current
      ? 1
      : 1 - Math.pow(1 - smoothing, frameScale);
    progress.current += (targetProgress.current - progress.current) * ease;

    const factor = Math.max(viewport.factor, 1);
    const planeWidth = Math.min(cardWidth / factor, viewport.width * 0.225);
    const planeHeight = planeWidth / cardAspectRatio;
    const spiralRadius = Math.min(radius / factor, viewport.width * 0.245);
    const gap = Math.min(verticalGap / factor, viewport.height * 0.082);
    const count = sceneItems.length;

    meshes.current.forEach((mesh, index) => {
      const material = materials.current[index];
      if (!mesh || !material) return;

      const position = wrappedPosition(index - progress.current, count);
      const angle = position * 0.78;
      const depth = (Math.cos(angle) + 1) / 2;
      const scale = 0.74 + depth * 0.26;

      const y = -position * gap;
      mesh.position.set(
        Math.sin(angle) * spiralRadius,
        y,
        Math.cos(angle) * 2.55,
      );
      mesh.rotation.set(0, Math.sin(angle) * -1.12, 0);
      mesh.scale.set(planeWidth * scale, planeHeight * scale, 1);

      // Soft vertical dissolve only at top/bottom edges (no mid-spiral fade).
      const halfH = viewport.height * 0.5;
      const fadeStart = halfH * 0.72;
      const fadeEnd = halfH * 1.08;
      const absY = Math.abs(y);
      let edgeFade = 1;
      if (absY > fadeStart) {
        const t = Math.min(
          Math.max((absY - fadeStart) / Math.max(fadeEnd - fadeStart, 0.001), 0),
          1,
        );
        edgeFade = 1 - t * t * (3 - 2 * t);
      }

      material.uniforms.uBend!.value = planeWidth * bend;
      material.uniforms.uPlaneAspect!.value = cardAspectRatio;
      material.uniforms.uOpacity!.value = edgeFade;
      material.depthWrite = edgeFade > 0.85;
    });
  });

  return (
    <>
      {sceneItems.map((item, index) => (
        <mesh
          key={`${item.src}-${index}`}
          ref={(node) => {
            meshes.current[index] = node;
          }}
          frustumCulled={false}
        >
          <planeGeometry args={[1, 1, 48, 2]} />
          <shaderMaterial
            ref={(node) => {
              materials.current[index] = node;
            }}
            uniforms={uniforms[index]}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            side={DoubleSide}
            transparent
            depthTest
            depthWrite
          />
        </mesh>
      ))}
    </>
  );
}

export function Spiral3DSlider({
  items,
  className,
  radius = 235,
  verticalGap = 64,
  cardWidth = 255,
  cardAspectRatio = 3 / 2,
  autoRotate = true,
  autoSpeed = 0.13,
  scrollSensitivity = 0.0024,
  smoothing = 0.065,
  bend = 0.17,
  fov = 44,
  ariaLabel = "Spiral image gallery",
}: Spiral3DSliderProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const targetProgress = useRef(0);
  const previousScroll = useRef(0);
  const lastWheelTime = useRef(0);
  const lastInteraction = useRef(0);
  const visible = useRef(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    previousScroll.current = window.scrollY;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      reducedMotion.current = motionQuery.matches;
    };
    syncMotionPreference();
    motionQuery.addEventListener("change", syncMotionPreference);

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting);
      },
      { threshold: 0.08 },
    );
    observer.observe(stage);

    const handlePageScroll = () => {
      const scrollY = window.scrollY;
      const delta = scrollY - previousScroll.current;
      previousScroll.current = scrollY;
      if (visible.current && performance.now() - lastWheelTime.current > 80) {
        lastInteraction.current = performance.now();
        const boundedDelta = Math.sign(delta) * Math.min(Math.abs(delta), 160);
        targetProgress.current += boundedDelta * scrollSensitivity;
      }
    };
    window.addEventListener("scroll", handlePageScroll, { passive: true });

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", syncMotionPreference);
      window.removeEventListener("scroll", handlePageScroll);
    };
  }, [scrollSensitivity]);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    lastWheelTime.current = performance.now();
    lastInteraction.current = lastWheelTime.current;
    const delta =
      Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 160);
    targetProgress.current += delta * scrollSensitivity;
  };

  if (!items.length) return null;

  return (
    <div
      ref={stageRef}
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "spiral-3d-slider relative min-h-[42rem] w-full overflow-hidden bg-transparent",
        className,
      )}
      onWheel={handleWheel}
    >
      <WebGLErrorBoundary
        fallback={<WebGLFallback className="absolute inset-0 h-full w-full" />}
      >
        <div className="absolute inset-0">
          <Canvas
            flat
            dpr={[1, 1.75]}
            camera={{ position: [0, 0, 10], fov, near: 0.1, far: 100 }}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: "high-performance",
              outputColorSpace: LinearSRGBColorSpace,
              toneMapping: NoToneMapping,
            }}
          >
            <Suspense fallback={null}>
              <SpiralScene
                items={items}
                targetProgress={targetProgress}
                radius={radius}
                verticalGap={verticalGap}
                cardWidth={cardWidth}
                cardAspectRatio={cardAspectRatio}
                autoRotate={autoRotate}
                autoSpeed={autoSpeed}
                smoothing={smoothing}
                bend={bend}
                reducedMotion={reducedMotion}
                lastInteraction={lastInteraction}
              />
            </Suspense>
            <GlassEdgePass reducedMotion={reducedMotion} />
          </Canvas>
        </div>
      </WebGLErrorBoundary>

      <div className="sr-only">
        <p>{ariaLabel}</p>
        <ul>
          {items.map((item, index) => (
            <li key={`${item.src}-description-${index}`}>{item.alt}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
