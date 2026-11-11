import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPainterly } from './painterly';

/**
 * Where the character sits on screen. Fractions of the viewport; (0, 0) is the top-left.
 * `bottom` may exceed 1 — the character is then cropped by the lower edge, key-art style.
 */
export type Framing = { top: number; bottom: number; x: number };

export type StageTheme = 'dark' | 'light';

export type StageOptions = {
  url: string;
  theme?: StageTheme;
  framing: Framing;
  /** resting turn of the body, radians; positive turns the character toward screen-left */
  yaw?: number;
  reducedMotion?: boolean;
  onProgress?: (fraction: number) => void;
};

const FOV = 21;

/** Light per theme. The dark row is the look the owner approved; the light row lifts it for a pale page. */
const LOOKS: Record<StageTheme, {
  sky: number; ground: number; hemi: number; key: number; keyColor: number;
  warm: number; cool: number; coolColor: number; rim: number; rimCool: number; env: number; exposure: number;
}> = {
  dark: {
    sky: 0xffffff, ground: 0x8b8f99, hemi: 2.05, key: 2.5, keyColor: 0xfff3e4,
    warm: 5.5, cool: 4.2, coolColor: 0xdfe9ff, rim: 1.15, rimCool: 0xe9f0ff, env: 0.28, exposure: 1.0,
  },
  light: {
    sky: 0xffffff, ground: 0xc9ccd2, hemi: 2.55, key: 2.9, keyColor: 0xfffaf2,
    warm: 3.2, cool: 1.6, coolColor: 0xffffff, rim: 0.55, rimCool: 0xffffff, env: 0.4, exposure: 1.04,
  },
};
const CLIPS = { idle: 'idle', flourish: 'flourish' } as const;

/** Tracks that never change are dropped: 509 bones ship keys, 87 actually move. */
function slim(clip: THREE.AnimationClip): THREE.AnimationClip {
  clip.tracks = clip.tracks.filter((track) => {
    if (track.name.endsWith('.scale')) return false;
    const v = track.values;
    const size = track.getValueSize();
    for (let i = size; i < v.length; i++) {
      if (Math.abs(v[i]! - v[i % size]!) > 1e-4) return true;
    }
    return false;
  });
  return clip;
}

export class HeroStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  private timer = new THREE.Timer();
  private rig = new THREE.Group();
  private mixer?: THREE.AnimationMixer;
  private actions: Partial<Record<keyof typeof CLIPS, THREE.AnimationAction>> = {};
  private head?: THREE.Object3D;
  private neck?: THREE.Object3D;
  private chest?: THREE.Object3D;
  private height = 2;
  bounds = new THREE.Box3();
  private raf = 0;
  private disposed = false;
  private pointer = new THREE.Vector2();
  private eased = new THREE.Vector2();
  private intro = 0;
  /** shared look controls for every material on the character */
  readonly look = createPainterly();
  private hemi = new THREE.HemisphereLight(0xffffff, 0x8b8f99, 2.05);
  private keyLight = new THREE.DirectionalLight(0xfff3e4, 2.5);
  private rimWarm = new THREE.DirectionalLight(0xff6a24, 5.5);
  private rimCool = new THREE.DirectionalLight(0xdfe9ff, 4.2);
  private resizeObserver: ResizeObserver;
  private framing: Framing;
  private yaw: number;
  private reduced: boolean;
  private theme: StageTheme;

  constructor(private canvas: HTMLCanvasElement, private opts: StageOptions) {
    this.framing = opts.framing;
    this.yaw = opts.yaw ?? 0;
    this.reduced = !!opts.reducedMotion;
    this.theme = opts.theme ?? 'dark';

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral keeps the painted base colours where the artist put them; ACES would shift them.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // A high flat fill so the hand-painted albedo carries the image, a soft key for form,
    // two back lights for the rim that the reference lobby is built on.
    this.scene.add(this.hemi);
    this.keyLight.position.set(-2.6, 3.4, 4.2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.035;
    this.keyLight.shadow.radius = 5;
    const sc = this.keyLight.shadow.camera;
    sc.left = -1.6; sc.right = 1.6; sc.top = 2.6; sc.bottom = -0.4; sc.near = 0.5; sc.far = 12;
    this.rimWarm.position.set(3.4, 2.2, -3.2);
    this.rimCool.position.set(-3.6, 2.8, -2.6);
    this.scene.add(this.keyLight, this.keyLight.target, this.rimWarm, this.rimCool);
    this.keyLight.target.position.set(0, 1.1, 0);
    this.applyTheme();

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.42 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor, this.rig);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  async load(): Promise<void> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(this.opts.url, (e) => {
      if (e.total) this.opts.onProgress?.(e.loaded / e.total);
    });
    if (this.disposed) return;
    const model = gltf.scene;
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    model.traverse((obj) => {
      const mesh = obj as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false; // the bind-pose bounds do not follow the animation
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.map) mat.map.anisotropy = Math.min(8, maxAniso);
      const name = mat.name;
      if (name.endsWith('__hair')) {
        // hair cards: cut-out with coverage AA instead of sorted blending
        mat.transparent = false;
        mat.alphaTest = 0.42;
        mat.alphaToCoverage = true;
        mat.depthWrite = true;
        mat.side = THREE.DoubleSide;
        mat.roughness = 0.7;
      } else if (name.endsWith('__glass')) {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.opacity = 0.85;
        mesh.castShadow = false;
        mesh.renderOrder = 2;
      }
      if (!name.endsWith('__glass')) {
        this.look.apply(mat, { skin: name.endsWith('__skin'), hair: name.endsWith('__hair') });
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    this.height = box.max.y - box.min.y;
    this.bounds = box;
    this.rig.add(model);
    this.rig.rotation.y = this.yaw;

    this.head = model.getObjectByName('head');
    this.neck = model.getObjectByName('neck_01');
    this.chest = model.getObjectByName('spine_04');

    this.mixer = new THREE.AnimationMixer(model);
    for (const key of Object.keys(CLIPS) as (keyof typeof CLIPS)[]) {
      const clip = gltf.animations.find((c) => c.name === CLIPS[key]);
      if (clip) this.actions[key] = this.mixer.clipAction(slim(clip));
    }
    const idle = this.actions.idle;
    if (idle) {
      idle.play();
      if (this.reduced) {
        idle.paused = true;
      }
    }
    const flourish = this.actions.flourish;
    if (flourish) {
      flourish.setLoop(THREE.LoopOnce, 1);
      flourish.clampWhenFinished = false;
    }
    this.mixer.addEventListener('finished', () => {
      if (flourish && idle) {
        idle.reset().play();
        flourish.crossFadeTo(idle, 0.45, false);
      }
    });

    this.resize();
    this.mixer.update(0);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    this.timer.connect(document);
    this.timer.reset();
    this.loop();
  }

  /** -1..1 on both axes, origin at the viewport centre */
  setPointer(x: number, y: number) {
    this.pointer.set(x, y);
  }

  setFraming(framing: Framing) {
    this.framing = framing;
    this.resize();
  }

  setTheme(theme: StageTheme) {
    if (theme === this.theme) return;
    this.theme = theme;
    this.applyTheme();
  }

  private applyTheme() {
    const l = LOOKS[this.theme];
    this.hemi.color.setHex(l.sky);
    this.hemi.groundColor.setHex(l.ground);
    this.hemi.intensity = l.hemi;
    this.keyLight.color.setHex(l.keyColor);
    this.keyLight.intensity = l.key;
    this.rimWarm.intensity = l.warm;
    this.rimCool.intensity = l.cool;
    this.rimCool.color.setHex(l.coolColor);
    this.look.rimStrength.value = l.rim;
    this.look.rimCool.setHex(l.rimCool);
    this.scene.environmentIntensity = l.env;
    this.renderer.toneMappingExposure = l.exposure;
  }

  /** One-shot personality move, then back to the idle. */
  flourish() {
    const { idle, flourish } = this.actions;
    if (!idle || !flourish || this.reduced || flourish.isRunning()) return;
    flourish.reset().play();
    idle.crossFadeTo(flourish, 0.3, false);
  }

  private onVisibility = () => {
    cancelAnimationFrame(this.raf);
    if (!document.hidden && !this.disposed && this.mixer) this.loop();
  };

  private resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.place(0);
    this.camera.updateProjectionMatrix();
  }

  /** Solve the camera so head-top and soles land on the requested screen fractions. */
  private place(push: number) {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const { top, bottom, x } = this.framing;
    const span = this.height / (bottom - top); // world metres across the full viewport height
    const dist = span / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    const lookY = this.height - (0.5 - top) * span;
    const camY = lookY - dist * 0.055; // slightly below eye line: the figure reads taller
    this.camera.position.set(this.eased.x * -0.1, camY + this.eased.y * 0.04, dist * (1 + push));
    this.camera.lookAt(0, lookY, 0);
    this.camera.setViewOffset(w, h, (0.5 - x) * w, 0, w, h);
  }

  private tmpQ = new THREE.Quaternion();
  private parentQ = new THREE.Quaternion();
  private deltaQ = new THREE.Quaternion();
  private euler = new THREE.Euler();

  /** Rotate a bone by a world-space delta, after the mixer has written its pose. */
  private nudge(bone: THREE.Object3D | undefined, yaw: number, pitch: number) {
    if (!bone || !bone.parent) return;
    bone.parent.getWorldQuaternion(this.parentQ);
    this.deltaQ.setFromEuler(this.euler.set(pitch, yaw, 0, 'YXZ'));
    this.tmpQ.copy(this.parentQ).invert().multiply(this.deltaQ).multiply(this.parentQ);
    bone.quaternion.premultiply(this.tmpQ);
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const k = 1 - Math.exp(-dt * 4.5);
    if (!this.reduced) this.eased.lerp(this.pointer, k);
    this.intro = Math.min(1, this.intro + dt / 1.6);
    const ease = 1 - Math.pow(1 - this.intro, 4);

    this.mixer?.update(dt);
    // the character follows the cursor with the head first, the chest a little, the body least
    const yaw = this.eased.x * 0.42;
    const pitch = this.eased.y * 0.2;
    this.nudge(this.chest, yaw * 0.16, 0);
    this.nudge(this.neck, yaw * 0.34, pitch * 0.4);
    this.nudge(this.head, yaw * 0.5, pitch * 0.6);
    this.rig.rotation.y = this.yaw + this.eased.x * 0.09;

    this.place((1 - ease) * 0.07);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.timer.dispose();
    this.mixer?.stopAllAction();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const mat = mesh.material as THREE.MeshStandardMaterial;
      for (const tex of [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap, mat.emissiveMap]) tex?.dispose();
      mat.dispose();
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
