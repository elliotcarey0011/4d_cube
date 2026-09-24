import * as THREE from "three";

// Shell faces sample a Data3DTexture volume (x, y, t). Front/back faces show a
// single (x,y) frame at the current scrub time; top/bottom/left/right faces
// show (x,t) / (y,t) time-slices, which is what produces the "melting" motion
// streaks on the outside of the cube.
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
  uniform int uAxis; // 0 = xy (front/back), 1 = xt (top/bottom), 2 = yt (left/right)
  uniform float uFixedValue; // fixed y (axis 1) or x (axis 2), in [0,1]
  uniform float uScrubT; // current scrub time, in [0,1], used by axis 0

  void main() {
    vec3 coord;
    if (uAxis == 0) {
      coord = vec3(vUv.x, vUv.y, uScrubT);
    } else if (uAxis == 1) {
      coord = vec3(vUv.x, uFixedValue, vUv.y);
    } else {
      coord = vec3(uFixedValue, vUv.x, vUv.y);
    }
    fragColor = texture(uVolume, coord);
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
    transparent: false,
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
