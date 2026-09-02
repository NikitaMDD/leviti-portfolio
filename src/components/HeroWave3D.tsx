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

// В отличие от HeroR3F (плоский процедурный шум) — здесь настоящая 3D-геометрия:
// плоскость деформируется по Z в одну крупную волну/складку, нормали считаются
// через конечные разности и освещаются направленным светом, как на референсе.
const VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vHeight;
  varying vec2 vEdgeUv;

  uniform float uTime;
  uniform float uPhase;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;

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
    for (int i = 0; i < 3; i++) {
      f += amp * snoise(p);
      p *= 2.02;
      amp *= 0.5;
    }
    return f;
  }

  // Плоское схождение высоты к нулю у краёв геометрии (не только цвета!) —
  // иначе при больших смещениях край меша может физически уйти за пределы
  // кадра или вывернуться боком к камере, и там, где меша уже нет, видна
  // голая заливка канваса — "лента как бы пропадает".
  float edgeTaper(vec2 p) {
    float tx = 1.0 - smoothstep(2.85, 3.75, abs(p.x));
    float ty = 1.0 - smoothstep(1.7, 2.3, abs(p.y));
    return tx * ty;
  }

  // Лента с несколькими отчётливыми сгибами вдоль направления dir — сумма
  // нескольких гладких гармоник (не шум!). Каждая гармоника непрерывна и
  // регулярна, поэтому получаются цельные протяжённые складки, а не
  // шумовая "холмистая" текстура (как было с fbm-рябью).
  //
  // phase — НЕ время, а отдельно накапливаемая величина, которая идёт
  // быстрее при энергичной музыке (см. JS: phaseRef += delta*(0.15+energy)).
  // Поэтому и весь узор складок, и позиции акцентов "путешествуют" быстрее
  // именно тогда, когда музыка активнее — а не крутятся по одному кругу.
  float waveHeight(vec2 pos, float phase) {
    vec2 dir = normalize(vec2(1.0, 0.35));
    float u = dot(pos, dir);

    // очень низкая частота — только пологий увод линии складок по длине,
    // не создаёт локальных бугров
    float bend = (snoise(pos * 0.045 + vec2(phase * 0.15, -phase * 0.12)) * 0.6
      + snoise(pos * 0.09 + vec2(phase * 0.15, -phase * 0.12) + 3.1) * 0.3) * 0.4;
    float uu = u + bend;

    float w = sin(uu * 0.55 + phase * 0.33) * 1.15
      + sin(uu * 1.05 - 0.9 + phase * 0.23) * 0.62
      + sin(uu * 1.7 + 1.6 - phase * 0.19) * 0.3;

    // аудио добавляет более быстрые гармоники — складки резче и "живее"
    // под музыку, но не исчезают полностью в тишине
    float wAudio = sin(uu * 2.4 + phase * 0.6) * uBass * 0.7
      + sin(uu * 3.3 - 1.1 - phase * 0.47) * uMid * 0.5
      + sin(uu * 4.6 + 2.0 - phase * 0.73) * uTreble * 0.3;

    float amp = 0.95 + uBass * 0.55;
    float base = (w + wAudio) * amp;

    // Точечные акценты — позиции "блуждают" через медленный шум от phase,
    // поэтому один и тот же удар баса каждый раз мнёт ленту в новом месте,
    // а не в одной и той же точке
    vec2 dirPerp = vec2(-dir.y, dir.x);
    float v = dot(pos, dirPerp);

    float seedA = snoise(vec2(phase * 0.6, 11.3)) * 3.0;
    float seedB = snoise(vec2(phase * 0.5 + 5.0, -4.2)) * 3.0;
    float seedVA = snoise(vec2(phase * 0.45 - 2.0, 8.8)) * 1.2;
    float seedVB = snoise(vec2(phase * 0.4 + 9.0, 1.1)) * 1.2;

    float spike1 = exp(-pow((uu - seedA) / 0.85, 2.0) - pow((v - seedVA) / 1.3, 2.0));
    float spike2 = exp(-pow((uu - seedB) / 0.8, 2.0) - pow((v - seedVB) / 1.15, 2.0));

    float spikes = spike1 * uBass * 1.6 - spike2 * uMid * 1.3;

    return (base + spikes) * edgeTaper(pos);
  }

  void main() {
    vec2 pos2 = position.xy;
    float h = waveHeight(pos2, uPhase);

    float e = 0.06;
    float hx = waveHeight(pos2 + vec2(e, 0.0), uPhase);
    float hy = waveHeight(pos2 + vec2(0.0, e), uPhase);
    vec3 tangentX = vec3(e, 0.0, hx - h);
    vec3 tangentY = vec3(0.0, e, hy - h);
    vec3 n = normalize(cross(tangentX, tangentY));

    vec3 displaced = vec3(pos2, h);
    vNormal = normalize(normalMatrix * n);
    vHeight = h;
    vEdgeUv = uv;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vHeight;
  varying vec2 vEdgeUv;

  uniform float uTime;
  uniform float uTreble;

  uniform vec3 uColorBlack;
  uniform vec3 uColorBlackPearl;
  uniform vec3 uColorLust;
  uniform vec3 uColorOrange;
  uniform vec3 uColorTeal;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(vec3(-0.5, 0.45, 0.9));

    float diffuse = max(dot(N, L), 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);

    // тёмная база — только для самых глубоких теней/впадин
    vec3 base = mix(uColorBlack, uColorBlackPearl, clamp(vHeight * 0.5 + 0.5, 0.0, 1.0));

    // широкий плавный переход teal -> orange по всей шкале освещённости,
    // а не сжатый в узкую зону — поэтому оба цвета реально видны
    float warmth = smoothstep(0.08, 0.82, diffuse);
    vec3 gradient = mix(uColorTeal, uColorOrange, warmth);

    // lust — только акцент в самых ярких/выпуклых точках, не поглощает orange
    float hot = smoothstep(0.8, 1.0, diffuse) * smoothstep(-0.2, 1.1, vHeight);
    gradient = mix(gradient, uColorLust, hot * 0.6);

    // тёмные впадины остаются тёмной базой, освещённые места — цветным
    // градиентом; между ними плавный переход по свету+высоте
    float presence = clamp(diffuse * 0.7 + vHeight * 0.25 + 0.25, 0.0, 1.0);
    vec3 color = mix(base, gradient, presence);

    // тёплый rim-свет по силуэту складки, как на референсе
    color += uColorOrange * rim * 0.5;

    // привязка яркости к глубине — мягче, чем раньше (не должно уходить
    // в почти чёрный на впадинах)
    color *= mix(0.55, 1.25, clamp(vHeight * 0.35 + 0.6, 0.0, 1.0));

    // зерно
    float grainA = rand(gl_FragCoord.xy + fract(uTime) * 130.0);
    float grainB = rand(gl_FragCoord.xy * 0.6 - fract(uTime) * 91.0);
    float grain = mix(grainA, grainB, 0.5);
    color += (grain - 0.5) * (0.14 + uTreble * 0.2);

    // плавное растворение в чёрный у краёв полотна — чтобы геометрия нигде
    // не обрывалась жёсткой линией, даже если её граница попадает в кадр
    float edgeFade = smoothstep(0.0, 0.22, vEdgeUv.x) * smoothstep(1.0, 0.78, vEdgeUv.x)
      * smoothstep(0.0, 0.22, vEdgeUv.y) * smoothstep(1.0, 0.78, vEdgeUv.y);
    color = mix(uColorBlack, color, edgeFade);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function CameraLook() {
  const { camera } = useThree();
  useFrame(() => {
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function WaveMesh() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const smoothed = useRef({ bass: 0, mid: 0, treble: 0 });
  const phaseRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPhase: { value: 0 },
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

  useFrame((state, delta) => {
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

    // "Фаза" узора идёт быстрее при энергичной музыке и медленнее в тишине —
    // это то, что делает движение складок явно завязанным на музыку, а не
    // просто равномерно крутящимся по кругу независимо от неё.
    const energy = s.bass * 0.6 + s.mid * 0.3 + s.treble * 0.1;
    phaseRef.current += delta * (0.15 + energy * 1.1);

    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uPhase.value = phaseRef.current;
    material.uniforms.uBass.value = s.bass;
    material.uniforms.uMid.value = s.mid;
    material.uniforms.uTreble.value = s.treble;
  });

  return (
    <mesh>
      <planeGeometry args={[7.5, 4.6, 150, 100]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function HeroWave3D() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "low-power" }}
      camera={{ position: [0.5, 0.4, 4.2], fov: 45 }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#0c1416"]} />
      <CameraLook />
      <WaveMesh />
    </Canvas>
  );
}
