import * as THREE from 'three';

/**
 * The characters are hand-painted: the brush strokes, the painted light and the colour
 * decisions all live in the base-colour texture. A stock PBR pass buries that under
 * reflections and a photographic falloff, so the standard material is patched here:
 *
 *   1. the light terminator is wrapped and pulled into soft bands, the way a painter
 *      blocks light and shadow, instead of a smooth photographic gradient;
 *   2. roughness has a floor, so cloth and skin never pick up a plastic sheen;
 *   3. a two-tone silhouette rim (cool on one side, warm on the other) is added in
 *      view space — the lobby look of the reference.
 *
 * Everything is driven by shared uniforms, so the stage can retune the whole character at once.
 */
export type PainterlyLook = {
  rimWarm: THREE.Color;
  rimCool: THREE.Color;
  rimStrength: { value: number };
  rimStart: { value: number };
  wrap: { value: number };
  banding: { value: number };
  apply: (mat: THREE.MeshStandardMaterial, kind: { skin?: boolean; hair?: boolean }) => void;
};

const DIRECT_OLD =
  /float dotNL = saturate\( dot\( geometryNormal, directLight\.direction \) \);\s*vec3 irradiance = dotNL \* directLight\.color;/;

const DIRECT_NEW = `float rawNL = dot( geometryNormal, directLight.direction );
	float dotNL = saturate( rawNL );
	float wrapNL = saturate( ( rawNL + uWrap ) / ( 1.0 + uWrap ) );
	float soft = smoothstep( 0.0, 1.0, wrapNL );
	float steps = 3.0;
	float cell = soft * steps;
	float stepped = ( floor( cell ) + smoothstep( 0.0, 0.55, fract( cell ) ) ) / steps;
	vec3 irradiance = mix( soft, stepped, uBanding ) * directLight.color;`;

const OUT_OLD = 'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;';

const OUT_NEW = `vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	{
		float fres = 1.0 - saturate( dot( geometryNormal, geometryViewDir ) );
		float rim = smoothstep( uRimStart, 1.0, fres );
		vec3 rimColor = mix( uRimCool, uRimWarm, smoothstep( -0.3, 0.3, geometryNormal.x ) );
		float lift = saturate( geometryNormal.y * 0.6 + 0.7 );
		outgoingLight += rimColor * rim * lift * uRimStrength * ( 0.4 + 0.6 * diffuseColor.rgb );
	}`;

export function createPainterly(): PainterlyLook {
  const shared = {
    uRimWarm: { value: new THREE.Color(0xff7a2f) },
    uRimCool: { value: new THREE.Color(0xe9f0ff) },
    uRimStrength: { value: 1.15 },
    uRimStart: { value: 0.52 },
    uWrap: { value: 0.22 },
    uBanding: { value: 0.4 },
  };

  const apply: PainterlyLook['apply'] = (mat, kind) => {
    const minRough = kind.skin ? 0.58 : kind.hair ? 0.62 : 0.34;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, shared, { uMinRough: { value: minRough } });
      const pars = THREE.ShaderChunk.lights_physical_pars_fragment;
      if (!DIRECT_OLD.test(pars) || !shader.fragmentShader.includes(OUT_OLD)) {
        console.warn('painterly: three.js shader layout changed, falling back to the stock material');
        return;
      }
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform vec3 uRimWarm;
uniform vec3 uRimCool;
uniform float uRimStrength;
uniform float uRimStart;
uniform float uWrap;
uniform float uBanding;
uniform float uMinRough;`,
        )
        .replace('#include <lights_physical_pars_fragment>', pars.replace(DIRECT_OLD, DIRECT_NEW))
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
	roughnessFactor = max( roughnessFactor, uMinRough );`,
        )
        .replace(OUT_OLD, OUT_NEW);
    };
    mat.customProgramCacheKey = () => `painterly-${minRough}`;
    mat.needsUpdate = true;
  };

  return {
    rimWarm: shared.uRimWarm.value,
    rimCool: shared.uRimCool.value,
    rimStrength: shared.uRimStrength,
    rimStart: shared.uRimStart,
    wrap: shared.uWrap,
    banding: shared.uBanding,
    apply,
  };
}
