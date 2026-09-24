import * as THREE from "three";
import { makeShellMaterial, makeGhostMaterial } from "./cubeShaders.js";

function quadGeometry(corners, uvs) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(corners.flat());
  const uvArr = new Float32Array(uvs.flat());
  const indices = [0, 1, 2, 0, 2, 3];
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvArr, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Builds the spacetime cube: 6 outer "shell" faces sampling the video volume
 * (front/back = current frame, top/bottom/left/right = time-slices), plus a
 * stack of low-opacity internal frame planes you can fly through.
 */
export class SpacetimeCube {
  constructor(volumeResult, { width = 2.2, ghostCount = 48, ghostOpacity = 0.18 } = {}) {
    const { texture, aspect, frameCount } = volumeResult;
    this.texture = texture;
    this.frameCount = frameCount;

    const hw = width / 2;
    const hh = width / aspect / 2;
    const hd = width * 0.65; // depth (time) extent

    this.halfSize = { hw, hh, hd };

    this.group = new THREE.Group();
    this.shellMaterials = [];

    const faceDefs = [
      // Front/back: axis 0, sample (u, v, scrubT)
      {
        axis: 0,
        fixedValue: 0,
        corners: [
          [-hw, -hh, hd],
          [hw, -hh, hd],
          [hw, hh, hd],
          [-hw, hh, hd],
        ],
        uvs: [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      },
      {
        axis: 0,
        fixedValue: 0,
        corners: [
          [hw, -hh, -hd],
          [-hw, -hh, -hd],
          [-hw, hh, -hd],
          [hw, hh, -hd],
        ],
        uvs: [
          [1, 0],
          [0, 0],
          [0, 1],
          [1, 1],
        ],
      },
      // Top/bottom: axis 1, sample (u, fixedValue, t)
      {
        axis: 1,
        fixedValue: 1,
        corners: [
          [-hw, hh, -hd],
          [-hw, hh, hd],
          [hw, hh, hd],
          [hw, hh, -hd],
        ],
        uvs: [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
        ],
      },
      {
        axis: 1,
        fixedValue: 0,
        corners: [
          [-hw, -hh, hd],
          [-hw, -hh, -hd],
          [hw, -hh, -hd],
          [hw, -hh, hd],
        ],
        uvs: [
          [0, 1],
          [0, 0],
          [1, 0],
          [1, 1],
        ],
      },
      // Left/right: axis 2, sample (fixedValue, v, t)
      {
        axis: 2,
        fixedValue: 1,
        corners: [
          [hw, -hh, hd],
          [hw, -hh, -hd],
          [hw, hh, -hd],
          [hw, hh, hd],
        ],
        uvs: [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
        ],
      },
      {
        axis: 2,
        fixedValue: 0,
        corners: [
          [-hw, -hh, -hd],
          [-hw, -hh, hd],
          [-hw, hh, hd],
          [-hw, hh, -hd],
        ],
        uvs: [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 0],
        ],
      },
    ];

    for (const def of faceDefs) {
      const geo = quadGeometry(def.corners, def.uvs);
      const mat = makeShellMaterial(texture, { axis: def.axis, fixedValue: def.fixedValue, scrubT: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      this.group.add(mesh);
      this.shellMaterials.push(mat);
    }

    // Internal ghost stack: thin frame planes spanning the front/back (x,y) extent,
    // distributed along the time (z) axis from back (t=0) to front (t=1).
    this.ghostMaterials = [];
    const ghostGeo = quadGeometry(
      [
        [-hw, -hh, 0],
        [hw, -hh, 0],
        [hw, hh, 0],
        [-hw, hh, 0],
      ],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]
    );
    for (let i = 0; i < ghostCount; i++) {
      const t = ghostCount === 1 ? 0.5 : i / (ghostCount - 1);
      const z = -hd + t * (2 * hd);
      const mat = makeGhostMaterial(texture, t, ghostOpacity);
      const mesh = new THREE.Mesh(ghostGeo, mat);
      mesh.position.z = z;
      this.group.add(mesh);
      this.ghostMaterials.push(mat);
    }

    // Thin wireframe edge outline for readability, like the reference images.
    const edgeGeo = new THREE.BoxGeometry(2 * hw, 2 * hh, 2 * hd);
    const edges = new THREE.EdgesGeometry(edgeGeo);
    this.wireframe = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
    );
    this.group.add(this.wireframe);
  }

  setScrub(t) {
    for (const mat of this.shellMaterials) {
      if (mat.uniforms.uAxis.value === 0) mat.uniforms.uScrubT.value = t;
    }
  }

  setGhostOpacity(opacity) {
    for (const mat of this.ghostMaterials) mat.uniforms.uOpacity.value = opacity;
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.texture.dispose();
  }
}
