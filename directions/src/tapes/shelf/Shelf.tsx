import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { renderCover, renderSpine, renderWrap, type CoverSpec } from '../covers/draw';
import { clunk } from '../fx/sound';

type Props = {
  specs: CoverSpec[];
  locked: boolean[];
  focus: number;
  pulled: number | null;
  onFocus: (i: number) => void;
  onPull: (i: number | null) => void;
};

const TW = 1.0; // tape width
const TH = 1.6; // tape height
const TD = 0.27; // tape depth
const GAP = 1.2; // spacing between tapes
const SHELF_Y = -0.86; // shelf top surface
const CAM_Z = 7.4;

/** A shelf of VHS tapes you drag through and pull out. */
export function Shelf({ specs, locked, focus, pulled, onFocus, onPull }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ focus, pulled, onFocus, onPull });
  state.current = { focus, pulled, onFocus, onPull };
  const api = useRef<{ panTo: (i: number) => void } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.className = 'tp-shelf__gl';

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x070707, 9, 17);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    camera.position.set(0, 0.2, CAM_Z);
    camera.lookAt(0, -0.05, 0);

    // light: warm key, burnt-orange rim from the left, low ambient
    scene.add(new THREE.AmbientLight(0xfff1e6, 0.55));
    const key = new THREE.DirectionalLight(0xffe4d0, 1.5);
    key.position.set(3, 4, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff7a2e, 1.4);
    rim.position.set(-6, 1.5, 1.5);
    scene.add(rim);
    const pool = new THREE.PointLight(0xff8a3d, 6, 4.2, 1.6);
    pool.position.set(0, -0.2, 1.1);
    scene.add(pool);

    // shelf, back wall, upper board
    const wood = new THREE.MeshStandardMaterial({ color: 0x1c1a19, roughness: 0.82, metalness: 0.05 });
    const shelf = new THREE.Mesh(new RoundedBoxGeometry(80, 0.12, 1.3, 2, 0.03), wood);
    shelf.position.set(0, SHELF_Y - 0.06, 0.05);
    scene.add(shelf);
    const lip = new THREE.Mesh(new RoundedBoxGeometry(80, 0.2, 0.08, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x242120, roughness: 0.7 }));
    lip.position.set(0, SHELF_Y - 0.09, 0.72);
    scene.add(lip);
    const upper = new THREE.Mesh(new RoundedBoxGeometry(80, 0.1, 1.3, 2, 0.03), wood);
    upper.position.set(0, SHELF_Y + TH + 0.36, 0.05);
    scene.add(upper);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 12), new THREE.MeshStandardMaterial({ color: 0x0d0c0b, roughness: 1 }));
    wall.position.set(0, 0, -0.62);
    scene.add(wall);

    // tapes
    const group = new THREE.Group();
    scene.add(group);
    const tapeGeo = new RoundedBoxGeometry(TW, TH, TD, 3, 0.035);
    const wrapGeo = new RoundedBoxGeometry(TW + 0.03, TH + 0.03, TD + 0.03, 3, 0.04);
    const plastic = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.42, metalness: 0.1 });
    const textures: THREE.Texture[] = [];
    const mats: THREE.Material[] = [plastic, wood];
    const wrapTex = new THREE.CanvasTexture(renderWrap());
    wrapTex.colorSpace = THREE.SRGBColorSpace;
    textures.push(wrapTex);
    const wrapMat = new THREE.MeshStandardMaterial({ map: wrapTex, transparent: true, opacity: 0.9, roughness: 0.12, metalness: 0.0, depthWrite: false, color: 0xffffff });
    mats.push(wrapMat);
    const sealTex = new THREE.CanvasTexture(sealCanvas());
    sealTex.colorSpace = THREE.SRGBColorSpace;
    textures.push(sealTex);
    const sealMat = new THREE.MeshBasicMaterial({ map: sealTex, transparent: true, toneMapped: false });
    mats.push(sealMat);
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.0),
      new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = SHELF_Y + 0.004;
    group.add(halo);

    type T = { mesh: THREE.Mesh; front: THREE.MeshStandardMaterial; spine: THREE.MeshStandardMaterial; base: THREE.Vector3; hover: number; pull: number; dim: number };
    const tapes: T[] = specs.map((spec, i) => {
      const front = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.05, emissive: 0xffffff, emissiveIntensity: 0 });
      const spine = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.55 });
      mats.push(front, spine);
      // box material order: +x, -x, +y, -y, +z (cover), -z
      const mesh = new THREE.Mesh(tapeGeo, [plastic, spine, plastic, plastic, front, plastic]);
      const base = new THREE.Vector3(i * GAP, SHELF_Y + TH / 2 + 0.002, 0);
      mesh.position.copy(base);
      mesh.userData.index = i;
      group.add(mesh);
      if (locked[i]) {
        const wrap = new THREE.Mesh(wrapGeo, wrapMat);
        wrap.userData.index = i;
        mesh.add(wrap);
        const seal = new THREE.Mesh(new THREE.CircleGeometry(0.15, 40), sealMat);
        seal.position.set(0.27, 0.28, TD / 2 + 0.022);
        seal.rotation.z = -0.25;
        mesh.add(seal);
      }
      void renderCover(spec).then((cv) => {
        if (disposed) return;
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        textures.push(t);
        front.map = t;
        front.emissiveMap = t;
        front.color.set(0xffffff);
        front.needsUpdate = true;
      });
      void renderSpine(spec).then((cv) => {
        if (disposed) return;
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        textures.push(t);
        spine.map = t;
        spine.color.set(0xffffff);
        spine.needsUpdate = true;
      });
      return { mesh, front, spine, base, hover: 0, pull: 0, dim: locked[i] ? 1 : 0 };
    });

    // pan: the group slides; clamp so the row stays framed
    const view = { halfW: 3.4 };
    const panMax = () => -view.halfW + 3.05; // first tape sits right of the title
    const panMin = () => Math.min(panMax(), view.halfW - 1.1 - (specs.length - 1) * GAP);
    let pan = panMax();
    let panTarget = pan;
    const clampPan = (p: number) => Math.max(panMin(), Math.min(panMax(), p));
    const panTo = (i: number) => {
      // keep the focused tape inside the comfortable middle of the frame
      const x = i * GAP + panTarget;
      const lo = -view.halfW + 3.0;
      const hi = view.halfW - 0.75;
      if (x < lo) panTarget = clampPan(panTarget + (lo - x));
      if (x > hi) panTarget = clampPan(panTarget - (x - hi));
    };
    api.current = { panTo };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // narrower screens: step back so the title and four tapes still fit side by side
      camera.position.z = CAM_Z * Math.max(1, 1.72 / camera.aspect);
      camera.updateProjectionMatrix();
      view.halfW = camera.position.z * Math.tan(THREE.MathUtils.degToRad(15)) * camera.aspect;
      panTarget = clampPan(panTarget);
      pan = Math.min(pan, panMax());
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    pan = panTarget = clampPan(panMax());
    panTo(state.current.focus);
    pan = panTarget;

    // pointer: drag to pan, click to pull, hover to lift
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hovered = -1;
    let drag: { x: number; pan: number; moved: boolean; t: number; v: number; lastX: number } | null = null;
    const pick = (cx: number, cy: number) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(tapes.map((t) => t.mesh), true);
      const hit = hits[0];
      if (!hit) return -1;
      let o: THREE.Object3D | null = hit.object;
      while (o && o.userData.index === undefined) o = o.parent;
      return o ? (o.userData.index as number) : -1;
    };
    const unitsPerPx = () => (view.halfW * 2) / el.clientWidth;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, pan: panTarget, moved: false, t: performance.now(), v: 0, lastX: e.clientX };
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (drag) {
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 5) drag.moved = true;
        const now = performance.now();
        drag.v = ((e.clientX - drag.lastX) / Math.max(1, now - drag.t)) * 16;
        drag.t = now;
        drag.lastX = e.clientX;
        if (drag.moved) panTarget = clampPan(drag.pan + dx * unitsPerPx());
        renderer.domElement.style.cursor = 'grabbing';
        return;
      }
      hovered = pick(e.clientX, e.clientY);
      renderer.domElement.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
    };
    const up = (e: PointerEvent) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      renderer.domElement.style.cursor = 'grab';
      if (d.moved) {
        panTarget = clampPan(panTarget + d.v * unitsPerPx() * 9);
        return;
      }
      const i = pick(e.clientX, e.clientY);
      const s = state.current;
      if (i < 0) {
        if (s.pulled !== null) s.onPull(null);
        return;
      }
      s.onFocus(i);
      s.onPull(s.pulled === i ? null : i);
      clunk(s.pulled === i ? 'tick' : 'play');
    };
    const leave = () => {
      hovered = -1;
    };
    const cvs = renderer.domElement;
    cvs.addEventListener('pointerdown', down);
    cvs.addEventListener('pointermove', move);
    cvs.addEventListener('pointerup', up);
    cvs.addEventListener('pointerleave', leave);
    cvs.style.cursor = 'grab';
    cvs.style.touchAction = 'pan-y';

    // render only while on screen
    let visible = false;
    const io = new IntersectionObserver(([en]) => {
      visible = !!en?.isIntersecting;
    });
    io.observe(el);

    let last = performance.now();
    let t = 0;
    let raf = 0;
    const tmpQ = new THREE.Quaternion();
    const restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.24, 0));
    const pullQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.05, -0.12, 0.02));
    const hoverQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.1, 0));
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const s = state.current;
      const k = 1 - Math.pow(0.0015, dt);
      pan += (panTarget - pan) * k;
      group.position.x = pan;
      tapes.forEach((tp, i) => {
        const isPulled = s.pulled === i;
        tp.pull += ((isPulled ? 1 : 0) - tp.pull) * (1 - Math.pow(0.0009, dt));
        tp.hover += ((hovered === i && !isPulled ? 1 : 0) - tp.hover) * k;
        const otherPulled = s.pulled !== null && !isPulled;
        const dimTarget = locked[i] ? 1 : otherPulled ? 0.6 : 0;
        tp.dim += (dimTarget - tp.dim) * k;
        // pulled tape travels to the front, centred left of the info card
        const px = -pan - view.halfW * 0.04;
        const target = new THREE.Vector3(
          THREE.MathUtils.lerp(tp.base.x, px, tp.pull),
          tp.base.y + tp.hover * 0.07 + tp.pull * 0.16 + Math.sin(t * 1.6) * 0.012 * tp.pull,
          tp.base.z + tp.pull * 2.05 + tp.hover * 0.12,
        );
        tp.mesh.position.lerp(target, 1);
        tmpQ.copy(restQ).slerp(hoverQ, tp.hover).slerp(pullQ, tp.pull);
        tp.mesh.quaternion.copy(tmpQ);
        const lit = 1 - tp.dim * 0.78;
        tp.front.emissiveIntensity = (tp.front.map ? 0.5 : 0) * lit + tp.pull * 0.15;
        tp.front.color.setScalar(tp.front.map ? lit : 0.13);
      });
      const f = tapes[s.focus];
      if (f) {
        halo.position.x += (f.base.x - halo.position.x) * k;
        pool.position.x = halo.position.x + pan;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      cvs.removeEventListener('pointerdown', down);
      cvs.removeEventListener('pointermove', move);
      cvs.removeEventListener('pointerup', up);
      cvs.removeEventListener('pointerleave', leave);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m: THREE.Material & { map?: THREE.Texture | null }) => {
            m.map?.dispose();
            m.dispose();
          });
        }
      });
      mats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      cvs.remove();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.panTo(focus);
  }, [focus]);

  return <div ref={host} className="tp-shelf__host" />;
}

function sealCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(100, 90, 10, 128, 128, 128);
  gr.addColorStop(0, '#ff6a5c');
  gr.addColorStop(0.6, '#ff3d2e');
  gr.addColorStop(1, '#b81f14');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(128, 128, 124, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = 'bold 34px "Space Mono"';
  g.fillText('SEALED', 128, 116);
  g.font = '70px "VT323"';
  g.fillText('LOCKED', 128, 176);
  return c;
}

function haloTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(128, 64, 2, 128, 64, 120);
  gr.addColorStop(0, 'rgba(255,138,61,.75)');
  gr.addColorStop(0.5, 'rgba(255,106,26,.18)');
  gr.addColorStop(1, 'rgba(255,106,26,0)');
  g.fillStyle = gr;
  g.save();
  g.scale(1, 0.5);
  g.beginPath();
  g.arc(128, 128, 128, 0, Math.PI * 2);
  g.restore();
  g.fillRect(0, 0, 256, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
