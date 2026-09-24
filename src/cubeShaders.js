import * as THREE from "three";

// Shell faces sample a Data3DTexture volume (x, y, t): the top/bottom/left/right
// faces show (x,t) / (y,t) time-slices, which is what produces the "melting"
// motion streaks on the outside of the cube. Each face is a progressive reveal
// mask: only the portion of the slice up to the current scrub time is opaque,
// the rest stays fully transparent, so the cube fills in as playback advances.
const vertexShader = /* glsl */ `
  in vec3 position;
  in vec2 uv;
  out vec2 vUv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler3D;

  in vec2 vUv;
  out vec4 fragColor;

  uniform sampler3D uVolume;
  uniform int uAxis; // 1 = xt (top/bottom), 2 = yt (left/right)
  uniform float uFixedValue; // fixed y (axis 1) or x (axis 2), in [0,1]
  uniform float uScrubT; // current scrub time, in [0,1]

  void main() {
    // On both remaining faces, vUv.y is the time coordinate being sampled.
    vec3 coord = (uAxis == 1)
      ? vec3(vUv.x, uFixedValue, vUv.y)
      : vec3(uFixedValue, vUv.x, vUv.y);
    vec4 c = texture(uVolume, coord);

    const float edge = 0.015;
    float revealed = 1.0 - smoothstep(uScrubT - edge, uScrubT + edge, vUv.y);
    fragColor = vec4(c.rgb, revealed);
  }
`;

export function makeShellMaterial(volumeTexture, { axis, fixedValue = 0, scrubT = 0 }) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader,
    fragmentShader,
    uniforms: {
      uVolume: { value: volumeTexture },
      uAxis: { value: axis },
      uFixedValue: { value: fixedValue },
      uScrubT: { value: scrubT },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
}

// Ghost planes: thin translucent (x,y) frame slices stacked along the time
// axis, so flying inside the cube reveals many low-opacity frames at once.
const ghostVertexShader = /* glsl */ `
  in vec3 position;
  in vec2 uv;
  out vec2 vUv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ghostFragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler3D;

  in vec2 vUv;
  out vec4 fragColor;

  uniform sampler3D uVolume;
  uniform float uT;
  uniform float uOpacity;

  void main() {
    vec4 c = texture(uVolume, vec3(vUv.x, vUv.y, uT));
    fragColor = vec4(c.rgb, uOpacity);
  }
`;

export function makeGhostMaterial(volumeTexture, t, opacity) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: ghostVertexShader,
    fragmentShader: ghostFragmentShader,
    uniforms: {
      uVolume: { value: volumeTexture },
      uT: { value: t },
      uOpacity: { value: opacity },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}
