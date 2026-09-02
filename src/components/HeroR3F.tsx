import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { audioSpectrum } from "../stores/player";
import { boost } from "../lib/audioReactivity";

// Palette (см. CLAUDE.md — дизайн-система v2)
const COLOR_BLACK = new THREE.Color("#0c1416");
const COLOR_BLACK_PEARL = new THREE.Color("#1A2C30");
const COLOR_LUST = new THREE.Color("#E4201B");
const COLOR_ORANGE = new THREE.Color("#FE7E3C");
const COLOR_TEAL = new THREE.Color("#0E6873");

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;

  uniform vec3 uColorBlack;
  uniform vec3 uColorBlackPearl;
  uniform vec3 uColorLust;
  uniform vec3 uColorOrange;
  uniform vec3 uColorTeal;

  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float f = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      f += amp * snoise(p);
      p *= 2.02;
      amp *= 0.5;
    }
    return f;
  }

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 1.6;

    float warpAmount = 3.6 + uBass * 2.4;
    float speed = 0.06 + uBass * 0.22;
    float swirl = 1.0 + uMid * 0.8;

    vec2 q = vec2(
      fbm(p * swirl + vec2(0.0, 0.0) + uTime * speed * 0.6),
      fbm(p * swirl + vec2(5.2, 1.3) - uTime * speed * 0.4)
    );

    vec2 r = vec2(
      fbm(p + warpAmount * q + vec2(1.7, 9.2) + uTime * speed),
      fbm(p + warpAmount * q + vec2(8.3, 2.8) + uTime * speed * 0.85)
    );

    float f = fbm(p + warpAmount * r);

    // Вместо конкурирующих весов — два независимых поля: "density" отделяет
    // фон от цветного пятна (даёт чёткие зоны, не размытую смесь), "warmth"
    // красит зону от teal к orange. Так каждый цвет реально доходит до
    // чистого hex-значения там, где он должен доминировать.
    //
    // density намеренно НЕ использует warpAmount (он и так завязан на бас
    // через f/r выше) — иначе бас двигает сами координаты сэмплирования шума
    // и края пятен дёргаются рывками вместо плавного "дыхания". Здесь только
    // фиксированный масштаб + плавный ход времени.
    float density = 0.5 + 0.5 * fbm(p * 1.1 + r * 2.2 + uTime * speed * 0.3);
    density = smoothstep(0.15, 0.85, density);

    float warmth = clamp(f * 1.3 + r.y * 0.6 + (vUv.y - 0.5) * 1.1, -1.0, 1.0);
    float hot = smoothstep(0.4, 0.9, r.x);

    vec3 bg = mix(uColorBlack, uColorBlackPearl, 0.5 + 0.5 * q.y);
    vec3 blobColor = mix(uColorTeal, uColorOrange, warmth * 0.5 + 0.5);
    blobColor = mix(blobColor, uColorLust, hot);

    vec3 color = mix(bg, blobColor, density);

    // лёгкая пульсация яркости от баса
    color *= 0.95 + uBass * 0.3;

    // крупное зерно — постоянно видимая шероховатость, треблом лишь усиливается
    float grainA = rand(gl_FragCoord.xy + fract(uTime) * 130.0);
    float grainB = rand(gl_FragCoord.xy * 0.6 - fract(uTime) * 91.0);
    float grain = mix(grainA, grainB, 0.5);
    color += (grain - 0.5) * (0.16 + uTreble * 0.22);

    // мягкая виньетка
    float vignette = smoothstep(1.05, 0.2, length(vUv - 0.5) * 1.4);
    color *= mix(0.82, 1.0, vignette);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function ShaderPlane() {
  const { viewport } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const smoothed = useRef({ bass: 0, mid: 0, treble: 0 });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uColorBlack: { value: COLOR_BLACK },
      uColorBlackPearl: { value: COLOR_BLACK_PEARL },
      uColorLust: { value: COLOR_LUST },
      uColorOrange: { value: COLOR_ORANGE },
      uColorTeal: { value: COLOR_TEAL },
    }),
    []
  );

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;

    const spectrum = audioSpectrum.get();
    const [b0, b1, b2, b3, b4, b5] = spectrum.length === 6 ? spectrum : [0, 0, 0, 0, 0, 0];

    const targetBass = (boost(b0) + boost(b1)) / 2;
    const targetMid = (boost(b2) + boost(b3)) / 2;
    const targetTreble = (boost(b4) + boost(b5)) / 2;

    const s = smoothed.current;
    s.bass += (targetBass - s.bass) * 0.12;
    s.mid += (targetMid - s.mid) * 0.12;
    s.treble += (targetTreble - s.treble) * 0.15;

    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uBass.value = s.bass;
    material.uniforms.uMid.value = s.mid;
    material.uniforms.uTreble.value = s.treble;
    material.uniforms.uResolution.value.set(state.size.width, state.size.height);
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
      />
    </mesh>
  );
}

export default function HeroR3F() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <ShaderPlane />
    </Canvas>
  );
}
