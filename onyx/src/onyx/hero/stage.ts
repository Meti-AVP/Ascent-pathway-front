import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { CHARACTERS, type CameraFraming, type CharacterId, type Framing } from './characters';
import { buildEnvironment, buildMaterial, buildRig, createShared, loadViewLut, roleOf, setLight, type Built, type Rig } from './look';
import { Blinker, Saccades, Spring, cameraMotion, fire, rng } from './life';

/**
 * The living hero, framework-free. LivingHero.tsx wraps it for React; the preview page drives it directly.
 * One transparent canvas that fills `host`, one character, Blender's light, and a life that stays quiet:
 * the baked idle loop (breathing, weight shift, head drift), blinks, a heavily damped head-and-eye follow
 * toward the cursor, a light that breathes like a fire out of frame, and a slow camera arrival and drift.
 */
export type HeroOptions = {
  character: CharacterId;
  /** 'reference' reproduces the Blender camera of the reference render (preview only) */
  view?: 'hero' | 'reference';
  /** defaults to the user's prefers-reduced-motion setting */
  reducedMotion?: boolean;
  /** hold the idle clip at this time (s): a still pose, for comparisons */
  freezeAt?: number;
  seed?: number;
  onReady?: () => void;
};
export type HeroStats = { fps: number; ms: number; dpr: number; frames: number; ready: boolean; blink?: number; gaze?: { yaw: number; pitch: number; cal: Record<string, number> } };
export type HeroHandle = { dispose(): void; stats(): HeroStats };

const DRACO_PATH = '/onyx/3d/draco/';
const LOOK_KEYS = ['eyeLookInLeft', 'eyeLookOutLeft', 'eyeLookUpLeft', 'eyeLookDownLeft', 'eyeLookInRight', 'eyeLookOutRight', 'eyeLookUpRight', 'eyeLookDownRight'] as const;
type LookKey = (typeof LOOK_KEYS)[number];
const BLINK_KEYS = ['eyeBlinkLeft', 'eyeBlinkRight'];
const DEFAULT_HEAD = ['neck_01', 'neck_02', 'head'];
const HEAD_SHARE = [0.25, 0.3, 0.45];
const D2R = Math.PI / 180;
// how far (m, at his eyes' distance from the camera) the cursor at the page edge pulls his gaze: ~7 deg, head ~3 deg
const FOLLOW_X = 0.3, FOLLOW_Y = 0.18;

type Ascent = { idle?: string; headBones?: string[] };

export function mountHero(host: HTMLElement, opts: HeroOptions): HeroHandle {
  const spec = CHARACTERS[opts.character];
  const stats: HeroStats = { fps: 0, ms: 0, dpr: 1, frames: 0, ready: false };
  if (!spec) return { dispose() {}, stats: () => stats };

  const framing: Framing = opts.view === 'reference' && spec.reference ? spec.reference : spec.framing;
  const reduce = opts.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = reduce || opts.freezeAt !== undefined;
  const blenderGaze = opts.view === 'reference' && opts.freezeAt !== undefined;
  const rand = rng(opts.seed ?? 0x5eed);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block',
    opacity: '0', transition: reduce ? 'opacity 0.4s linear' : 'opacity 1.4s cubic-bezier(.22,.7,.2,1)',
  } satisfies Partial<CSSStyleDeclaration>);
  if (framing.fade > 0) {
    const m = `linear-gradient(180deg, #000 0%, #000 ${((1 - framing.fade) * 100).toFixed(1)}%, transparent 100%)`;
    canvas.style.setProperty('mask-image', m);
    canvas.style.setProperty('-webkit-mask-image', m);
  }
  host.appendChild(canvas);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, stencil: false, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('[LivingHero] WebGL unavailable, keeping the still', err);
    canvas.remove();
    return { dispose() {}, stats: () => stats };
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // Blender's view transform is applied in every material
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 40);
  const S = createShared();
  const rig: Rig = buildRig(scene);
  const envRT = buildEnvironment(renderer);
  scene.environment = envRT.texture;

  let disposed = false;
  let ready = false;
  const abort = new AbortController();
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 1, height = 1;

  // ------------------------------------------------------------------ model state
  let model: THREE.Object3D | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  let headBones: THREE.Bone[] = [];
  const morphs: { mesh: THREE.Mesh; look: Partial<Record<LookKey, number>>; blink: number[] }[] = [];
  const textures = new Set<THREE.Texture>();
  const extraMaterials: THREE.Material[] = [];
  const eyeFrame = { fwd: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), left: new THREE.Vector3(1, 0, 0), origin: new THREE.Vector3() };
  const cal = { in: 30, out: 30, up: 22, down: 22 };
  let hasEyes = false;

  // ------------------------------------------------------------------ life state
  const pointer = { x: 0, y: 0, last: -1e9, inside: false };
  const eyeX = new Spring(7), eyeY = new Spring(7);
  const headX = new Spring(1.6), headY = new Spring(1.6);
  const sacX = new Spring(28), sacY = new Spring(28);
  const blinker = new Blinker(rand);
  const saccades = new Saccades(rand);
  let clock = 0;
  let readyAt = 0;

  // scratch objects: the frame loop allocates nothing
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3(), tmpV4 = new THREE.Vector3();
  const tmpV5 = new THREE.Vector3(), target = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpQ3 = new THREE.Quaternion();
  const gazeStat = { yaw: 0, pitch: 0, cal: {} as Record<string, number> };
  const camRight = new THREE.Vector3(), camUp = new THREE.Vector3(), camFwd = new THREE.Vector3();

  // ------------------------------------------------------------------ camera
  function placeCamera(m: ReturnType<typeof cameraMotion>) {
    const aspect = width / height;
    camera.aspect = aspect;
    if (framing.kind === 'band') {
      const f = framing;
      const span = f.band[1] - f.band[0];
      const baseHalf = Math.tan((f.fov * D2R) / 2);
      const half = aspect < f.minAspect ? (baseHalf * f.minAspect) / aspect : baseHalf;
      const dist = (span / 2 / baseHalf) * m.push;
      const az = (f.azimuth + m.az) * D2R, el = (f.elevation + m.el) * D2R;
      const tx = f.target[0], ty = f.target[1] + m.bob + m.rise, tz = f.target[2];
      camera.position.set(tx + dist * Math.sin(az) * Math.cos(el), ty + dist * Math.sin(el), tz + dist * Math.cos(az) * Math.cos(el));
      camera.up.set(0, 1, 0);
      camera.lookAt(tx, ty, tz);
      camera.fov = (2 * Math.atan(half)) / D2R;
      camera.updateProjectionMatrix();
      const e = camera.projectionMatrix.elements;
      e[8] += 1 - 2 * f.x;
      e[9] -= 1 - baseHalf / half; // a widened view keeps his head at the top
    } else {
      placeBlenderCamera(framing, aspect, m);
    }
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  function placeBlenderCamera(f: CameraFraming, aspect: number, m: ReturnType<typeof cameraMotion>) {
    const fwd = tmpV.set(...f.fwd).normalize();
    const pivot = tmpV2.set(...f.pos).addScaledVector(fwd, 1.75);
    const off = new THREE.Vector3(...f.pos).sub(pivot).multiplyScalar(m.push);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), m.az * D2R);
    camera.position.copy(pivot).add(off);
    camera.position.y += m.bob + m.rise;
    camera.up.set(...f.up);
    camera.lookAt(camera.position.clone().add(fwd));
    const k = f.sensor / 2 / f.lens; // Blender AUTO fit: the sensor spans the larger image side
    camera.fov = (2 * Math.atan(aspect >= 1 ? k / aspect : k)) / D2R;
    camera.updateProjectionMatrix();
    const e = camera.projectionMatrix.elements;
    e[8] += 2 * f.shift[0] * (aspect >= 1 ? 1 : 1 / aspect);
    e[9] += 2 * f.shift[1] * (aspect >= 1 ? aspect : 1);
  }

  // ------------------------------------------------------------------ loading
  async function loadModel(): Promise<GLTF> {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    try {
      return await loader.loadAsync(spec!.url);
    } finally {
      draco.dispose();
    }
  }

  function setupModel(gltf: GLTF) {
    const root = gltf.scene;
    const ascent = ((gltf.asset as { extras?: { ascent?: Ascent } }).extras?.ascent ?? {}) as Ascent;
    const built = new Map<THREE.Material, Built>();
    let eyeMesh: THREE.SkinnedMesh | null = null;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      const src = mesh.material as THREE.MeshPhysicalMaterial;
      let b = built.get(src);
      if (!b) {
        b = buildMaterial(src, roleOf(src), S);
        built.set(src, b);
      }
      mesh.material = b.main;
      mesh.castShadow = b.castShadow;
      mesh.receiveShadow = true;
      if (b.depth) mesh.customDepthMaterial = b.depth;
      if (roleOf(src) === 'eye') eyeMesh = mesh as THREE.SkinnedMesh;
      const dict = mesh.morphTargetDictionary;
      if (dict) {
        const look: Partial<Record<LookKey, number>> = {};
        for (const k of LOOK_KEYS) if (dict[k] !== undefined) look[k] = dict[k];
        morphs.push({ mesh, look, blink: BLINK_KEYS.map((k) => dict[k]).filter((i): i is number => i !== undefined) });
      }
    });
    for (const [src, b] of built) {
      if (b.depth) extraMaterials.push(b.depth);
      const pm = b.main as THREE.MeshPhysicalMaterial;
      for (const t of [pm.map, pm.normalMap, pm.roughnessMap, pm.metalnessMap]) if (t) textures.add(t);
      src.dispose();
    }
    model = root;
    scene.add(root);

    mixer = new THREE.AnimationMixer(root);
    const clip = gltf.animations.find((a) => a.name === (ascent.idle ?? 'Idle')) ?? gltf.animations[0];
    if (clip) mixer.clipAction(clip).play();
    mixer.setTime(opts.freezeAt ?? 0);

    headBones = (ascent.headBones ?? DEFAULT_HEAD).map((n) => root.getObjectByName(n)).filter((b): b is THREE.Bone => !!b && (b as THREE.Bone).isBone);
    if (eyeMesh) calibrateEyes(eyeMesh);
  }

  /**
   * Measure the eyes on the posed model: where each eyeball sits, which way "straight ahead" is for the
   * head, and how many degrees each eyeLook key turns the eye at full weight. Nothing is hard-coded, so
   * another character only has to follow the same naming.
   */
  function calibrateEyes(eye: THREE.SkinnedMesh) {
    const infl = eye.morphTargetInfluences, dict = eye.morphTargetDictionary;
    const head = headBones[headBones.length - 1];
    if (!infl || !dict || !head || !model) return;
    model.updateMatrixWorld(true);
    const saved = infl.slice();
    infl.fill(0);
    const pos = eye.geometry.attributes.position as THREE.BufferAttribute;
    let cx = 0;
    for (let i = 0; i < pos.count; i++) cx += pos.getX(i);
    cx /= pos.count;
    const L: number[] = [], R: number[] = [];
    for (let i = 0; i < pos.count; i++) (pos.getX(i) > cx ? L : R).push(i);
    if (!L.length || !R.length) return;
    const apex = (ids: number[]) => ids.reduce((b, i) => (pos.getZ(i) > pos.getZ(b) ? i : b), ids[0]!);
    const world = (i: number, out: THREE.Vector3) => eye.localToWorld(eye.getVertexPosition(i, out));
    const centre = (ids: number[]) => {
      const c = new THREE.Vector3(), p = new THREE.Vector3();
      for (const i of ids) c.add(world(i, p));
      return c.divideScalar(ids.length);
    };
    const cL = centre(L), cR = centre(R);
    const aL = apex(L), aR = apex(R);
    const pL = world(aL, new THREE.Vector3()), pR = world(aR, new THREE.Vector3());
    const fwd = pL.clone().sub(cL).normalize().add(pR.clone().sub(cR).normalize()).normalize();
    const left = cL.clone().sub(cR);
    left.addScaledVector(fwd, -left.dot(fwd)).normalize();
    const up = new THREE.Vector3().crossVectors(fwd, left).normalize();
    // degrees per unit of each key, measured on the left eye
    const r0 = pL.clone().sub(cL);
    const angle = (key: string) => {
      const idx = dict[key];
      if (idx === undefined) return null;
      infl.fill(0);
      infl[idx] = 1;
      const r1 = world(aL, new THREE.Vector3()).sub(cL);
      infl[idx] = 0;
      return (r0.angleTo(r1) / D2R) || null;
    };
    cal.out = angle('eyeLookOutLeft') ?? cal.out;
    cal.in = angle('eyeLookInLeft') ?? cal.in;
    cal.up = angle('eyeLookUpLeft') ?? cal.up;
    cal.down = angle('eyeLookDownLeft') ?? cal.down;
    for (let i = 0; i < saved.length; i++) infl[i] = saved[i]!;
    // keep the frame in head space so it rides with the head
    const qi = head.getWorldQuaternion(tmpQ).invert();
    eyeFrame.fwd.copy(fwd).applyQuaternion(qi);
    eyeFrame.left.copy(left).applyQuaternion(qi);
    eyeFrame.up.copy(up).applyQuaternion(qi);
    eyeFrame.origin.copy(head.worldToLocal(cL.clone().add(cR).multiplyScalar(0.5)));
    hasEyes = true;
  }

  // ------------------------------------------------------------------ per-frame life
  function rotateBoneWorld(bone: THREE.Bone, axis: THREE.Vector3, angle: number) {
    if (!bone.parent || Math.abs(angle) < 1e-7) return;
    const p = bone.parent.getWorldQuaternion(tmpQ);
    const local = tmpQ3.copy(p).invert().multiply(tmpQ2.setFromAxisAngle(axis, angle)).multiply(p);
    bone.quaternion.premultiply(local);
    bone.updateMatrixWorld(true);
  }

  const yAxis = new THREE.Vector3(0, 1, 0);
  const pitchAxis = new THREE.Vector3();

  function setGaze(at: THREE.Vector3) {
    const head = headBones[headBones.length - 1];
    if (!hasEyes || !head) return;
    const q = head.getWorldQuaternion(tmpQ);
    const fwd = tmpV.copy(eyeFrame.fwd).applyQuaternion(q);
    const origin = head.localToWorld(tmpV2.copy(eyeFrame.origin));
    const v = tmpV3.copy(at).sub(origin).normalize();
    const left = tmpV4.copy(eyeFrame.left).applyQuaternion(q);
    const up = tmpV5.copy(eyeFrame.up).applyQuaternion(q);
    const yaw = Math.max(-30, Math.min(30, Math.atan2(v.dot(left), v.dot(fwd)) / D2R));
    const pitch = Math.max(-22, Math.min(22, Math.atan2(v.dot(up), v.dot(fwd)) / D2R));
    gazeStat.yaw = Math.round(yaw * 10) / 10;
    gazeStat.pitch = Math.round(pitch * 10) / 10;
    gazeStat.cal = cal;
    stats.gaze = gazeStat;
    const w: Record<LookKey, number> = {
      eyeLookOutLeft: yaw > 0 ? yaw / cal.out : 0,
      eyeLookInRight: yaw > 0 ? yaw / cal.in : 0,
      eyeLookInLeft: yaw < 0 ? -yaw / cal.in : 0,
      eyeLookOutRight: yaw < 0 ? -yaw / cal.out : 0,
      eyeLookUpLeft: pitch > 0 ? pitch / cal.up : 0,
      eyeLookUpRight: pitch > 0 ? pitch / cal.up : 0,
      eyeLookDownLeft: pitch < 0 ? -pitch / cal.down : 0,
      eyeLookDownRight: pitch < 0 ? -pitch / cal.down : 0,
    };
    for (const m of morphs) {
      const infl = m.mesh.morphTargetInfluences!;
      for (const k of LOOK_KEYS) {
        const i = m.look[k];
        if (i !== undefined) infl[i] = w[k];
      }
    }
  }

  function setBlink(v: number) {
    for (const m of morphs) for (const i of m.blink) m.mesh.morphTargetInfluences![i] = v;
  }

  function update(dt: number) {
    clock += dt;
    const since = clock - readyAt;
    const motion = still ? { push: 1, rise: 0, az: 0, el: 0, bob: 0 } : cameraMotion(clock, since);
    placeCamera(motion);
    camera.updateMatrixWorld();
    camera.matrixWorld.extractBasis(camRight, camUp, camFwd);
    camFwd.negate();

    if (!still) {
      // a fire out of frame: the rims breathe most, the key a little, never a flicker you notice
      const a = fire(clock), b = fire(clock * 0.83 + 7.1);
      setLight(rig.rimHot, 1 + 0.06 * a);
      setLight(rig.rimDeep, 1 + 0.05 * b);
      setLight(rig.key, 1 + 0.018 * (0.6 * a + 0.4 * b));
    }

    if (!model || !mixer) return;
    if (!still) mixer.update(dt);
    model.updateMatrixWorld(true);

    // cursor -> where he looks (eyes quickly, head slowly and only a little); back to you when idle
    const idle = !pointer.inside || clock - pointer.last > 6;
    const px = still || idle ? 0 : pointer.x, py = still || idle ? 0 : pointer.y;
    const ex = eyeX.step(px, dt), ey = eyeY.step(py, dt);
    const hx = headX.step(px, dt), hy = headY.step(py, dt);
    if (!still) {
      saccades.update(clock);
      sacX.step(saccades.yaw, dt);
      sacY.step(saccades.pitch, dt);
    }
    const headBone = headBones[headBones.length - 1];
    const dist = camera.position.distanceTo(hasEyes && headBone ? headBone.localToWorld(tmpV.copy(eyeFrame.origin)) : tmpV.set(0, 1.6, 0));
    if (headBones.length && !still) {
      pitchAxis.copy(camRight).setY(0).normalize();
      const yaw = Math.max(-3.5, Math.min(3.5, 0.45 * Math.atan((hx * FOLLOW_X) / dist) / D2R)) * D2R;
      const pitch = Math.max(-2.5, Math.min(2.5, 0.4 * Math.atan((hy * FOLLOW_Y) / dist) / D2R)) * D2R;
      headBones.forEach((b, i) => {
        const s = HEAD_SHARE[i] ?? 1 / headBones.length;
        rotateBoneWorld(b, yAxis, yaw * s);
        rotateBoneWorld(b, pitchAxis, pitch * s);
      });
    }
    target.copy(camera.position)
      .addScaledVector(camRight, ex * FOLLOW_X + Math.tan(sacX.x * D2R) * dist)
      .addScaledVector(camUp, -ey * FOLLOW_Y + Math.tan(sacY.x * D2R) * dist);
    if (!blenderGaze) setGaze(target);
    stats.blink = still ? 0 : 0.96 * blinker.value(clock);
    setBlink(stats.blink);
  }

  // ------------------------------------------------------------------ size, loop, visibility
  function resize() {
    const r = host.getBoundingClientRect();
    width = Math.max(1, Math.round(r.width));
    height = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    stats.dpr = dpr;
  }

  let raf = 0, running = false, last = 0, onscreen = true;
  const times: number[] = [];
  let slowFrames = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const t0 = performance.now();
    update(dt);
    renderer.render(scene, camera);
    const cpu = performance.now() - t0;
    stats.frames++;
    times.push(dt);
    if (times.length > 60) times.shift();
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    stats.fps = Math.round(1 / avg);
    stats.ms = Math.round((stats.ms * 0.9 + cpu * 0.1) * 100) / 100;
    // if this machine cannot hold ~55 fps, render fewer pixels (never below 1:1)
    slowFrames = avg > 1 / 52 && times.length >= 60 ? slowFrames + 1 : 0;
    if (slowFrames > 90 && dpr > 1) {
      dpr = Math.max(1, dpr - 0.25);
      slowFrames = 0;
      times.length = 0;
      resize();
    }
  }

  function start() {
    if (running || !ready || still || disposed || document.hidden || !onscreen) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  function renderOnce() {
    if (!ready || disposed) return;
    update(0);
    renderer.render(scene, camera);
  }

  const ro = new ResizeObserver(() => {
    resize();
    if (!running) renderOnce();
  });
  ro.observe(host);
  const io = new IntersectionObserver((entries) => {
    onscreen = entries.some((e) => e.isIntersecting);
    if (onscreen) start();
    else stop();
  });
  io.observe(host);
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    // relative to the canvas centre, in viewport units, so the whole page steers him a little
    pointer.x = Math.max(-1.4, Math.min(1.4, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
    pointer.y = Math.max(-1.2, Math.min(1.2, (e.clientY - (r.top + r.height * 0.3)) / (window.innerHeight / 2)));
    pointer.last = clock;
    pointer.inside = true;
  };
  const onLeave = () => (pointer.inside = false);
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  const onLost = (e: Event) => {
    e.preventDefault();
    stop();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  // ------------------------------------------------------------------ go
  resize();
  (async () => {
    try {
      const [lut, gltf] = await Promise.all([loadViewLut(abort.signal), loadModel()]);
      if (disposed) {
        lut.dispose();
        disposeTree(gltf.scene);
        return;
      }
      S.lut.value = lut;
      setupModel(gltf);
      update(0);
      await renderer.compileAsync(scene, camera);
      if (disposed) return;
      for (const t of textures) renderer.initTexture(t);
      renderer.render(scene, camera);
      ready = stats.ready = true;
      readyAt = clock;
      requestAnimationFrame(() => {
        if (disposed) return;
        canvas.style.opacity = '1';
        opts.onReady?.();
      });
      if (still) renderOnce();
      else start();
    } catch (err) {
      if (!disposed && !(err instanceof DOMException && err.name === 'AbortError')) console.warn('[LivingHero] could not start', err);
    }
  })();

  function disposeTree(root: THREE.Object3D) {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const pm = m as THREE.MeshPhysicalMaterial;
        for (const t of [pm.map, pm.normalMap, pm.roughnessMap, pm.metalnessMap]) t?.dispose();
        m.dispose();
      }
    });
  }

  return {
    stats: () => stats,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      abort.abort();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      if (mixer && model) {
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
      }
      if (model) disposeTree(model);
      for (const t of textures) t.dispose();
      for (const m of extraMaterials) m.dispose();
      rig.dispose();
      envRT.dispose();
      S.lut.value?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
