import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

/**
 * Look-dev for the living hero, matched to the Eevee renders of survival_clean.blend:
 *  - Blender's own view transform (AgX, look "Medium High Contrast", sRGB display) baked into a 3D LUT
 *    by survival/web/make_agx_lut.py and applied at the end of every material;
 *  - the Blender light rig (warm key, silver fill, two burnt-orange rim strips, 0.03 world) in the same
 *    positions and photometric units;
 *  - per-role materials: skin with a wrap/subsurface approximation, eyes with a clear-coat cornea,
 *    alpha-to-coverage hair cards, sheen on suede leather and denim.
 * Tuned side by side against renders/survival_poseA_portrait.png (preview.html?view=ref&t=0).
 */

// ---------------------------------------------------------------------------------- view transform
export const VIEW_LUT = { url: '/onyx/hero/agx_mhc_33.bin', size: 33, lmin: -12.47393, lmax: 4.5 } as const;

export type Shared = {
  lut: { value: THREE.Data3DTexture | null };
  exposure: { value: number };
  ambUp: { value: THREE.Color };
  ambDown: { value: THREE.Color };
  skinWrap: { value: THREE.Vector3 };
  skinBleed: { value: THREE.Vector3 };
  /** sin(angular radius) of each Blender light seen from the face, in spot order: key, rimHot, rimDeep, fill */
  spotSin: { value: number[] };
  /** how much of the skin's subsurface wrap each light gets (the rims light only the silhouette) */
  spotWrap: { value: number[] };
};

const lin = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

export function createShared(): Shared {
  return {
    lut: { value: null },
    exposure: { value: 1 },
    // Blender world: 0.03 grey, a touch cooler above (it only feeds bounce in the renders)
    ambUp: { value: lin(0.034, 0.037, 0.046) },
    ambDown: { value: lin(0.026, 0.024, 0.023) },
    // how far past the terminator each channel wraps (red scatters furthest), scaled by the SSS map
    skinWrap: { value: new THREE.Vector3(0.2, 0.08, 0.04) },
    // per-channel softening of shadow edges on skin (red bleeds into the penumbra)
    skinBleed: { value: new THREE.Vector3(0.62, 0.9, 1.0) },
    spotSin: { value: [0.22, 0.06, 0.06, 0.35] },
    spotWrap: { value: [1, 0.3, 0.3, 1] },
  };
}

export async function loadViewLut(signal?: AbortSignal): Promise<THREE.Data3DTexture> {
  const res = await fetch(VIEW_LUT.url, { signal });
  if (!res.ok) throw new Error(`view LUT ${res.status}`);
  const n = VIEW_LUT.size;
  const data = new Uint8Array(await res.arrayBuffer());
  if (data.length !== n * n * n * 4) throw new Error('view LUT size');
  const tex = new THREE.Data3DTexture(data, n, n, n);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping;
  tex.unpackAlignment = 1;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const f6 = (x: number) => x.toFixed(6);
const { lmin, lmax, size } = VIEW_LUT;

const COMMON_GLSL = /* glsl */ `
uniform highp sampler3D uOnyxLut;
uniform float uOnyxExposure;
uniform vec3 uOnyxAmbUp;
uniform vec3 uOnyxAmbDown;
float onyxRectSh = 1.0;
uniform float uOnyxSpotSin[ 4 ];
uniform float uOnyxSpotWrap[ 4 ];
float onyxLightSin = 0.0;
float onyxLightWrap = 1.0;
// irradiance from a light of angular radius asin(s): Lambert above the horizon band, a smooth quadratic
// roll-off through it (the soft terminator of Blender's big area lights, which a point light lacks)
float onyxSoftNL( float nl, float s ) {
  float q = max( nl + s, 0.0 );
  return nl >= s ? nl : q * q / max( 4.0 * s, 1e-4 );
}
vec3 onyxSoftNL3( float nl, vec3 s ) {
  vec3 q = max( vec3( nl ) + s, 0.0 );
  return mix( q * q / max( 4.0 * s, vec3( 1e-4 ) ), vec3( nl ), step( s, vec3( nl ) ) );
}
// Blender AgX + "Medium High Contrast", sampled in a log2 shaper; returns linear sRGB for three's output encode
vec3 onyxView( vec3 c ) {
  c = max( c * uOnyxExposure, vec3( 1e-10 ) );
  vec3 s = clamp( ( log2( c ) - ( ${f6(lmin)} ) ) * ${f6(1 / (lmax - lmin))}, 0.0, 1.0 );
  vec3 d = texture( uOnyxLut, s * ${f6((size - 1) / size)} + ${f6(0.5 / size)} ).rgb;
  return sRGBTransferEOTF( vec4( d, 1.0 ) ).rgb;
}
// diffuse bounce from the dark world only; the panels in the environment map feed reflections, not diffuse
vec3 onyxAmbient( const in vec3 normal ) {
  vec3 wn = inverseTransformDirection( normal, viewMatrix );
  return PI * mix( uOnyxAmbDown, uOnyxAmbUp, 0.5 + 0.5 * wn.y );
}
`;

const TINT_PLAIN = 'vec3 onyxShadowTint( float s ) { return vec3( s ); }\n';

type Shader = THREE.WebGLProgramParametersWithUniforms;

function must(src: string, find: string | RegExp, repl: string, what: string) {
  const out = src.replace(find, repl);
  if (out === src) console.warn(`[LivingHero] shader patch did not apply: ${what}`);
  return out;
}

/**
 * Light the way Eevee does. Each Blender area light is two three.js lights in the same place:
 *  - a spot light gives diffuse, sheen and the (soft, PCF) shadow;
 *  - a rect-area light of the real size gives specular and clear-coat (LTC), so highlights and the
 *    catchlight in the eyes have the true window / strip shape instead of a hot point.
 * The rect light's specular is multiplied by its spot's shadow, so eye sockets and the neck under the
 * jaw do not pick up unshadowed shine.
 */
type Patch = { pars?: string; tint?: string; physPars?: (src: string) => string; extra?: (fs: string) => string };

function patchMaterial(shader: Shader, S: Shared, p: Patch = {}) {
  shader.uniforms.uOnyxLut = S.lut;
  shader.uniforms.uOnyxExposure = S.exposure;
  shader.uniforms.uOnyxAmbUp = S.ambUp;
  shader.uniforms.uOnyxAmbDown = S.ambDown;
  shader.uniforms.uOnyxSpotSin = S.spotSin;
  shader.uniforms.uOnyxSpotWrap = S.spotWrap;
  let fs = shader.fragmentShader;
  fs = must(fs, '#include <common>', '#include <common>\n' + COMMON_GLSL + (p.pars ?? '') + (p.tint ?? TINT_PLAIN), 'common');
  fs = must(fs, '#include <tonemapping_fragment>', 'gl_FragColor.rgb = onyxView( gl_FragColor.rgb );', 'view transform');
  const C = THREE.ShaderChunk;
  const maps = must(C.lights_fragment_maps, 'iblIrradiance += getIBLIrradiance( geometryNormal );', 'iblIrradiance += onyxAmbient( geometryNormal );', 'ambient');
  fs = must(fs, '#include <lights_fragment_maps>', maps, 'ambient include');
  let phys = C.lights_physical_pars_fragment;
  phys = must(phys, 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
    'float dotNL = onyxSoftNL( dot( geometryNormal, directLight.direction ), onyxLightSin );', 'soft horizon');
  phys = must(phys, 'reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;', '', 'punctual specular');
  phys = must(phys, 'clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );', '', 'punctual clearcoat');
  phys = must(phys, 'reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );',
    'reflectedLight.directSpecular += onyxRectSh * lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );', 'rect specular');
  phys = must(phys, 'reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );', '', 'rect diffuse');
  phys = must(phys, 'clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );',
    'clearcoatSpecularDirect += onyxRectSh * lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );', 'rect clearcoat');
  if (p.physPars) phys = p.physPars(phys);
  fs = must(fs, '#include <lights_physical_pars_fragment>', phys, 'physical pars include');
  let begin = C.lights_fragment_begin;
  begin = must(begin,
    /directLight\.color \*= \( directLight\.visible && receiveShadow \) \? (getShadow\( spotShadowMap\[ i \][^;]*?) : 1\.0;/,
    'onyxSh[ i ] = ( directLight.visible && receiveShadow ) ? $1 : 1.0;\n\t\tdirectLight.color *= onyxShadowTint( onyxSh[ i ] );', 'spot shadow');
  begin = must(begin, 'spotLight = spotLights[ i ];', 'spotLight = spotLights[ i ];\n\t\tonyxLightSin = uOnyxSpotSin[ i ];\n\t\tonyxLightWrap = uOnyxSpotWrap[ i ];', 'light size');
  begin = must(begin, 'rectAreaLight = rectAreaLights[ i ];',
    'rectAreaLight = rectAreaLights[ i ];\n\t\tonyxRectSh = ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS ) ? onyxSh[ i ] : 1.0;', 'rect shadow');
  begin = 'float onyxSh[ 4 ];\nonyxSh[ 0 ] = 1.0; onyxSh[ 1 ] = 1.0; onyxSh[ 2 ] = 1.0; onyxSh[ 3 ] = 1.0;\n' + begin;
  fs = must(fs, '#include <lights_fragment_begin>', begin, 'lights begin include');
  // smoother soft shadows than three's 5-tap noisy PCF (its IGN rotation draws diagonal hatching on skin):
  // 16 Vogel taps, each hardware-filtered, with only a slight per-pixel turn
  let smap = C.shadowmap_pars_fragment;
  smap = must(smap, 'float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;',
    'float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2 * 0.2;', 'pcf rotation');
  smap = must(smap, /shadow = \(\s*texture\( shadowMap, vec3\( shadowCoord\.xy \+ vogelDiskSample\( 0, 5, phi \)[\s\S]*?\) \* 0\.2;/,
    `shadow = 0.0;
				for ( int k = 0; k < 16; k ++ ) {
					shadow += texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( k, 16, phi ) * radius, shadowCoord.z ) );
				}
				shadow *= 0.0625;`, 'pcf taps');
  fs = must(fs, '#include <shadowmap_pars_fragment>', smap, 'shadow pars include');
  if (p.extra) fs = p.extra(fs);
  shader.fragmentShader = fs;
}

const SKIN_GLSL = /* glsl */ `
uniform vec3 uSkinWrap;
uniform vec3 uSkinBleed;
float onyxSss = 0.0;
vec3 onyxDiffN = vec3( 0.0, 0.0, 1.0 );
`;
// red light bleeds into the penumbra of every shadow on skin
const SKIN_TINT = 'vec3 onyxShadowTint( float s ) { return mix( vec3( s ), pow( vec3( s ), uSkinBleed ), onyxSss ); }\n';
// hair cards pass light through: shadows inside the hair stay lighter
const HAIR_TINT = 'vec3 onyxShadowTint( float s ) { return vec3( mix( 1.0, s, 0.82 ) ); }\n';

function patchSkin(shader: Shader, S: Shared) {
  shader.uniforms.uSkinWrap = S.skinWrap;
  shader.uniforms.uSkinBleed = S.skinBleed;
  patchMaterial(shader, S, {
    pars: SKIN_GLSL,
    tint: SKIN_TINT,
    // wrapped, per-channel diffuse: red light reaches past the terminator the way it scatters in skin
    physPars: (phys) => must(phys, 'reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );',
      /* glsl */ `vec3 onyxW = uSkinWrap * onyxSss * onyxLightWrap;
    vec3 onyxWrapped = onyxSoftNL3( dot( onyxDiffN, directLight.direction ), onyxLightSin + onyxW );
    reflectedLight.directDiffuse += onyxWrapped * directLight.color * diffuseBRDF * ( 1.0 - F );`, 'skin wrap'),
    extra: (fs) => {
      // light scattered under the skin softens pores in the diffuse: shade diffuse with a blurred normal
      // (2.5 mips down), keep full detail for the specular
      fs = must(fs, '#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
    #if defined( USE_NORMALMAP_TANGENTSPACE )
      vec3 onyxNd = texture( normalMap, vNormalMapUv, 2.5 ).xyz * 2.0 - 1.0;
      onyxNd.xy *= normalScale * 0.85;
      onyxDiffN = normalize( tbn * onyxNd );
    #else
      onyxDiffN = normal;
    #endif`, 'skin diffuse normal');
      // the params map: R = specular level (Blender "Specular IOR Level"), G = roughness, B = subsurface weight
      fs = must(fs, '#include <roughnessmap_fragment>', /* glsl */ `#include <roughnessmap_fragment>
    #ifdef USE_ROUGHNESSMAP
      vec4 onyxParams = texture2D( roughnessMap, vRoughnessMapUv );
    #else
      vec4 onyxParams = vec4( 0.5, 0.5, 0.85, 1.0 );
    #endif
    onyxSss = onyxParams.b;`, 'skin params');
      return must(fs, '#include <lights_physical_fragment>', /* glsl */ `#include <lights_physical_fragment>
    material.specularColor *= 2.0 * onyxParams.r;
    material.specularColorBlended = material.specularColor;`, 'skin specular');
    },
  });
}

// The sclera darkens toward the lids and under the upper lid, the way Eevee's AO and lid shadows do.
// ONYX_IRIS is the iris centre in the eye texture (material extras.irisUV; Ahmed's is 0.477, 0.477).
const EYE_OCCLUSION = /* glsl */ `#include <lights_physical_fragment>
  {
    float onyxD = length( vMapUv - ONYX_IRIS );
    vec3 onyxWN = inverseTransformDirection( normal, viewMatrix );
    float onyxOcc = 0.86 * ( 1.0 - 0.78 * smoothstep( 0.12, 0.27, onyxD ) ) * ( 1.0 - 0.72 * smoothstep( -0.22, 0.34, onyxWN.y ) );
    material.diffuseColor *= onyxOcc;
    material.diffuseContribution *= onyxOcc;
    #ifdef USE_CLEARCOAT
      material.clearcoatRoughness = 0.06;
    #endif
  }`;

// Hair cards: alpha kept up across mips (thin strands do not dissolve with distance), then alpha-to-coverage
// (MSAA resolves the strand edges softly; shadows alpha-test at 0.5). Where hair overlaps the page edge,
// the canvas alpha can be up to a(1-a) short, which on the dark page is invisible.
const HAIR_A2C = /* glsl */ `
  #ifdef USE_MAP
    vec2 onyxTs = vec2( textureSize( map, 0 ) );
    vec2 onyxDx = dFdx( vMapUv * onyxTs ), onyxDy = dFdy( vMapUv * onyxTs );
    float onyxLod = max( 0.0, 0.5 * log2( max( dot( onyxDx, onyxDx ), dot( onyxDy, onyxDy ) ) ) );
    diffuseColor.a *= 1.0 + onyxLod * 0.1;
  #endif
  diffuseColor.a = smoothstep( 0.06, 0.8, diffuseColor.a );
  #include <alphatest_fragment>`;

// ---------------------------------------------------------------------------------- materials by role
export type Role = 'skin' | 'eye' | 'hair' | 'brows' | 'leather' | 'denim' | 'cloth' | 'teeth';
const ROLES: Role[] = ['skin', 'eye', 'hair', 'brows', 'leather', 'denim', 'cloth', 'teeth'];

export function roleOf(m: THREE.Material): Role {
  const r = (m.userData as { role?: string }).role;
  if (r && (ROLES as string[]).includes(r)) return r as Role;
  const n = m.name.toLowerCase();
  if (n.startsWith('skin')) return 'skin';
  if (n.includes('eye') && !n.includes('lash') && !n.includes('brow')) return 'eye';
  if (n.includes('hair')) return 'hair';
  if (n.includes('brow') || n.includes('lash')) return 'brows';
  if (n.includes('jacket') || n.includes('leather')) return 'leather';
  if (n.includes('jean') || n.includes('denim')) return 'denim';
  if (n.includes('teeth') || n.includes('mouth')) return 'teeth';
  return 'cloth';
}

type Src = THREE.MeshStandardMaterial & Partial<THREE.MeshPhysicalMaterial>;

function withAO(m: THREE.MeshPhysicalMaterial) {
  if (m.roughnessMap) {
    m.aoMap = m.roughnessMap; // R = ambient occlusion in the cloth params maps
    m.aoMapIntensity = 1;
  }
  return m;
}

function base(src: Src, S: Shared, key: string, patch?: (s: Shader) => void) {
  const m = new THREE.MeshPhysicalMaterial({
    name: src.name,
    map: src.map,
    normalMap: src.normalMap,
    normalScale: src.normalScale?.clone(),
    roughnessMap: src.roughnessMap,
    metalnessMap: src.metalnessMap,
    roughness: src.roughness,
    metalness: src.metalness,
  });
  m.onBeforeCompile = (shader) => (patch ? patch(shader) : patchMaterial(shader, S));
  m.customProgramCacheKey = () => 'onyx-hero-' + key;
  return m;
}

export type Built = { main: THREE.Material; depth?: THREE.Material; castShadow: boolean };

export function buildMaterial(src: Src, role: Role, S: Shared): Built {
  switch (role) {
    case 'skin': {
      const m = base(src, S, 'skin', (s) => patchSkin(s, S));
      m.metalness = 0;
      m.metalnessMap = null;
      m.roughness = 1;
      m.ior = 1.4;
      m.sheen = 0; // Blender's 0.06 peach-fuzz sheen: three's Charlie sheen turns it into an orange band under the rims
      m.envMapIntensity = 0.9;
      return { main: m, castShadow: true };
    }
    case 'eye': {
      const iris = (src.userData as { irisUV?: [number, number] }).irisUV ?? [0.477, 0.477];
      const m = base(src, S, 'eye', (sh) => patchMaterial(sh, S, { extra: (fs) => must(fs, '#include <lights_physical_fragment>', EYE_OCCLUSION, 'eye occlusion') }));
      m.defines = { ONYX_IRIS: `vec2( ${iris[0].toFixed(4)}, ${iris[1].toFixed(4)} )` };
      m.roughness = 0.28;
      m.metalness = 0;
      m.ior = 1.4;
      m.specularIntensity = 0.25;
      m.clearcoat = 1;
      m.clearcoatRoughness = 0.02;
      m.envMapIntensity = 0.6;
      return { main: m, castShadow: false };
    }
    case 'hair': {
      const core = base(src, S, 'hair', (sh) => patchMaterial(sh, S, { tint: HAIR_TINT, extra: (fs) => must(fs, '#include <alphatest_fragment>', HAIR_A2C, 'hair a2c') }));
      Object.assign(core, { roughness: 0.42, metalness: 0, ior: 1.55, specularIntensity: 0.85, sheen: 1, sheenRoughness: 0.4 });
      core.sheenColor = lin(0.12, 0.12, 0.12);
      core.side = THREE.DoubleSide;
      core.alphaToCoverage = true; // shadows still alpha-test at 0.5
      core.envMapIntensity = 0.8;
      return { main: core, castShadow: true };
    }
    case 'brows': {
      const m = base(src, S, 'brows');
      Object.assign(m, { roughness: 0.55, metalness: 0, specularIntensity: 0.7 });
      m.side = THREE.DoubleSide;
      m.transparent = true;
      m.depthWrite = false;
      m.alphaTest = 0.02;
      m.envMapIntensity = 0.6;
      // the lashes shade the top of the iris, as in the renders
      const depth = new THREE.MeshDepthMaterial({ map: src.map, alphaTest: 0.4, side: THREE.DoubleSide });
      return { main: m, depth, castShadow: true };
    }
    case 'leather': {
      const m = withAO(base(src, S, 'leather'));
      m.metalness = 1; // the params map carries metal only on the zip
      m.roughness = 1;
      m.sheen = 1;
      m.sheenColor = lin(0.09, 0.09, 0.09); // Blender 0.15; three's Charlie sheen reads brighter
      m.sheenRoughness = 0.45;
      m.envMapIntensity = 1;
      return { main: m, castShadow: true };
    }
    case 'denim': {
      const m = withAO(base(src, S, 'denim'));
      m.metalness = 1;
      m.roughness = 1;
      m.specularIntensity = 0.7;
      m.sheen = 1;
      m.sheenColor = lin(0.34, 0.37, 0.45);
      m.sheenRoughness = 0.45;
      return { main: m, castShadow: true };
    }
    case 'teeth': {
      const m = base(src, S, 'teeth');
      m.metalness = 0;
      m.metalnessMap = null;
      m.roughness = 1;
      m.ior = 1.45;
      return { main: m, castShadow: false };
    }
    default: {
      const m = withAO(base(src, S, 'cloth'));
      m.sheen = 1;
      m.sheenColor = lin(0.1, 0.1, 0.1);
      m.sheenRoughness = 0.45;
      return { main: m, castShadow: true };
    }
  }
}

// ---------------------------------------------------------------------------------- lights
type LightSpec = { pos: readonly [number, number, number]; target: readonly [number, number, number]; color: readonly [number, number, number]; power: number; size: readonly [number, number] };

/** survival_clean.blend, frame 1 (pose A), converted to glTF axes. Powers in Blender watts (the fill is 35 W in
 * Blender; 28 W here matches the far cheek of the render, where Eevee's soft shadowing takes a little off it). */
export const RIG = {
  key: { pos: [0.8405, 3.12073, 2.30925], target: [0, 1.4, 0], color: [1, 0.8, 0.62], power: 240, size: [1.0, 1.4] },
  fill: { pos: [-3.56665, 1.5763, -0.31204], target: [0, 1.2, 0], color: [0.62, 0.75, 1.0], power: 28, size: [2.2, 2.2] },
  rimHot: { pos: [0.68051, 2.72206, -1.8697], target: [0, 1.38, 0], color: [0.85499, 0.14413, 0.02519], power: 3400, size: [0.3, 1.6] },
  rimDeep: { pos: [1.76263, 2.65181, -1.01766], target: [0, 1.38, 0], color: [0.62396, 0.08438, 0.01444], power: 1700, size: [0.3, 1.6] },
} satisfies Record<string, LightSpec>;

type Pair = { spot: THREE.SpotLight; area: THREE.RectAreaLight; spotBase: number; areaBase: number };
export type Rig = Record<'key' | 'fill' | 'rimHot' | 'rimDeep', Pair> & { dispose(): void };

let ltcReady = false;

function pair(scene: THREE.Scene, L: LightSpec, shadowAngle: number, shadow: number, radius: number): Pair {
  // Diffuse + shadow: an area light of power P (W) seen from its front has intensity P / pi (Lambertian),
  // and three's physical spot uses Blender's radiometric convention (E = I / d^2).
  // a wide, even cone (the whole figure gets the full light, like an area light), with the shadow map
  // focused on the figure only (shadow.focus) so its texels stay small
  const angle = 0.75;
  const spot = new THREE.SpotLight(lin(...L.color), L.power / Math.PI, 0, angle, 0.25, 2);
  spot.position.set(...L.pos);
  spot.target.position.set(...L.target);
  if (shadow) {
    spot.castShadow = true;
    spot.shadow.mapSize.set(shadow, shadow);
    const d = new THREE.Vector3(...L.pos).distanceTo(new THREE.Vector3(...L.target));
    spot.shadow.camera.near = Math.max(0.3, d - 1.6);
    spot.shadow.camera.far = d + 1.6;
    spot.shadow.bias = -0.0004;
    spot.shadow.normalBias = shadow >= 2048 ? 0.005 : 0.008;
    spot.shadow.radius = radius;
    spot.shadow.focus = shadowAngle / angle;
  }
  // Specular: the same light as a rectangle of its real size; intensity is radiance, P / (pi * A)
  const area = new THREE.RectAreaLight(lin(...L.color), L.power / (Math.PI * L.size[0] * L.size[1]), L.size[0], L.size[1]);
  area.position.set(...L.pos);
  area.lookAt(...L.target);
  scene.add(spot, spot.target, area);
  return { spot, area, spotBase: spot.intensity, areaBase: area.intensity };
}

/** Order matters: shadowed spots first, rect lights in the same order (their specular reuses the spot's shadow). */
export function buildRig(scene: THREE.Scene): Rig {
  if (!ltcReady) {
    RectAreaLightUniformsLib.init();
    ltcReady = true;
  }
  const key = pair(scene, RIG.key, 0.42, 2048, 5);
  const rimHot = pair(scene, RIG.rimHot, 0.34, 2048, 4);
  const rimDeep = pair(scene, RIG.rimDeep, 0.34, 1024, 3);
  const fill = pair(scene, RIG.fill, 0.36, 1024, 6);
  return {
    key, rimHot, rimDeep, fill,
    dispose() {
      for (const p of [key, rimHot, rimDeep, fill]) {
        p.spot.dispose();
        p.area.dispose();
      }
    },
  };
}

/** Scale a light pair around its Blender value (the fire flicker). */
export function setLight(p: Pair, k: number) {
  p.spot.intensity = p.spotBase * k;
  p.area.intensity = p.areaBase * k;
}

/**
 * Reflections: the dark world plus the four light shapes as panels, prefiltered (PMREM). Only specular
 * and clear-coat read it (the cornea's catchlight, the zip, the sheen at grazing angles); diffuse bounce
 * comes from onyxAmbient.
 */
export function buildEnvironment(renderer: THREE.WebGLRenderer, panelScale = 0.1) {
  const env = new THREE.Scene();
  const head = new THREE.Vector3(0, 1.55, 0);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: lin(0.03, 0.033, 0.04), side: THREE.BackSide }));
  env.add(sky);
  const geos: THREE.BufferGeometry[] = [sky.geometry];
  const mats: THREE.Material[] = [sky.material];
  for (const L of [RIG.key, RIG.fill, RIG.rimHot, RIG.rimDeep] as LightSpec[]) {
    const p = new THREE.Vector3(...L.pos).sub(head);
    const dist = p.length();
    const r = 6;
    const k = r / dist;
    const radiance = L.power / (Math.PI * L.size[0] * L.size[1]);
    const c = lin(...L.color).multiplyScalar(radiance * panelScale);
    const g = new THREE.PlaneGeometry(L.size[0] * k, L.size[1] * k);
    const m = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
    const panel = new THREE.Mesh(g, m);
    panel.position.copy(p.normalize().multiplyScalar(r));
    panel.lookAt(0, 0, 0);
    env.add(panel);
    geos.push(g);
    mats.push(m);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0, 0.1, 50);
  pmrem.dispose();
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  return rt;
}
