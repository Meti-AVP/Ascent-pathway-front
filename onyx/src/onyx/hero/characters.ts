/**
 * The cast of living characters. Each entry is one GLB plus how to frame it; everything else is read
 * from the GLB itself:
 *   - materials by `extras.role` (skin | eye | hair | brows | leather | denim | cloth | teeth),
 *   - the looping clip (`asset.extras.ascent.idle`, else the first clip),
 *   - the ARKit keys `eyeBlinkLeft/Right` and `eyeLook{In,Out,Up,Down}{Left,Right}` (calibrated at load),
 *   - the UE5-style bones `neck_01`, `neck_02`, `head` (`asset.extras.ascent.headBones` can override).
 * Adding Sara = drop `sara.glb` next to `ahmed.glb` (built the way `survival/web/build_web.py` builds Ahmed)
 * and give her a framing below. `SUPPORTED` in LivingHero.tsx follows this table on its own.
 *
 * Coordinates are glTF: metres, +Y up, the character stands at the origin facing +Z.
 */
export type CharacterId = 'ahmed' | 'sara';
export type Vec3 = readonly [number, number, number];

/** A hero framing that adapts to any box: the band [bottom, top] of world heights fills the box height. */
export type BandFraming = {
  kind: 'band';
  /** the point the camera aims at */
  target: Vec3;
  /** direction from the target to the camera, degrees: 0 = straight in front, + = toward his left (+X) */
  azimuth: number;
  /** degrees above the target (negative: a slightly low, heroic camera) */
  elevation: number;
  /** vertical field of view in degrees (23.9 = an 85 mm portrait lens) */
  fov: number;
  /** world heights that fill the box height: [bottom, top] */
  band: readonly [number, number];
  /** boxes narrower than this (width / height) widen the view so the shoulders stay inside */
  minAspect: number;
  /** where the target sits across the box, 0 = left edge, 1 = right edge */
  x: number;
  /** soft fade-out over this fraction of the box, from the bottom edge up (0 = none) */
  fade: number;
};

/** A fixed Blender camera, reproduced exactly (used to compare with the Eevee renders). */
export type CameraFraming = {
  kind: 'camera';
  pos: Vec3;
  fwd: Vec3;
  up: Vec3;
  /** focal length and sensor (mm); Blender's AUTO fit: the sensor spans the larger image side */
  lens: number;
  sensor: number;
  /** Blender lens shift, in fractions of the larger image side */
  shift: readonly [number, number];
  /** the render's width / height */
  aspect: number;
  fade: number;
};

export type Framing = BandFraming | CameraFraming;

export type CharacterSpec = {
  url: string;
  framing: BandFraming;
  /** the Blender camera of the reference render, for side-by-side checks in the preview */
  reference?: CameraFraming;
};

export const CHARACTERS: Record<CharacterId, CharacterSpec | null> = {
  ahmed: {
    url: '/onyx/hero/ahmed.glb',
    framing: {
      kind: 'band',
      target: [-0.02, 1.47, 0.04],
      azimuth: -40,
      elevation: -2,
      fov: 23.9,
      band: [0.98, 1.96],
      minAspect: 0.62,
      x: 0.5,
      fade: 0.2,
    },
    // survival_clean.blend, Cam_A_portrait (renders/survival_poseA_portrait.png, 1200 x 1500)
    reference: {
      kind: 'camera',
      pos: [-0.99556, 1.62487, 1.23793],
      fwd: [0.64232, 0.03826, -0.76548],
      up: [-0.0246, 0.99927, 0.02931],
      lens: 85,
      sensor: 36,
      shift: [-0.038409, -0.116261],
      aspect: 1200 / 1500,
      fade: 0,
    },
  },
  // fornewassets/converted/female/web (build_web.py + finish_glb.py): the Org Admin reading and approving on a
  // tablet. Her gaze is baked in the clip (no eyeLook keys); blinks and the head's cursor follow come from here.
  sara: {
    url: '/onyx/hero/sara.glb',
    framing: {
      kind: 'band',
      target: [0.0, 1.32, 0.04],
      azimuth: -40,
      elevation: -2,
      fov: 23.9,
      band: [0.92, 1.72],
      minAspect: 0.62,
      x: 0.5,
      fade: 0.18,
    },
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
