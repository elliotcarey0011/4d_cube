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
 * Builds the spacetime cube as a progressive "empty out" effect: the cube
 * starts full (the whole video visible via (x,t)/(y,t) time-slices on the
 * top/bottom/left/right "shell" faces) and empties out behind the current
 * scrub position as playback advances — only the portion of each slice from
 * the scrub time onward stays opaque, the already-passed portion goes fully
 * transparent. A stack of internal frame planes runs through the depth (time)
 * axis at low "trail" opacity for the remaining (not-yet-passed) frames, with
 * a brightness peak at whichever plane's time matches the current scrub
 * position — that peak is the "current frame", and it sits at whatever depth
 * in the cube corresponds to where you are in the video, not pinned to any face.
 */
export class SpacetimeCube {
  constructor(volumeResult, { width = 2.2, ghostCount = 48, trailOpacity = 0.15, motionThreshold = 0.12 } = {}) {
    const { texture, aspect, frameCount } = volumeResult;
    this.texture = texture;
    this.frameCount = frameCount;
    this.trailOpacity = trailOpacity;
    this.peakOpacity = 0.9;
    this.peakWidth = 0.05;
    this.motionThreshold = motionThreshold;
    this._t = 0;

    const hw = width / 2;
    const hh = width / aspect / 2;
    const hd = width * 0.65; // depth (time) extent

    this.halfSize = { hw, hh, hd };

    this.group = new THREE.Group();
    this.shellMaterials = [];

    // const faceDefs = [
    //   // Top/bottom: axis 1, sample (u, fixedValue, t)
    //   {
    //     axis: 1,
    //     fixedValue: 1,
    //     corners: [
    //       [-hw, hh, -hd],
    //       [-hw, hh, hd],
    //       [hw, hh, hd],
    //       [hw, hh, -hd],
    //     ],
    //     uvs: [
    //       [0, 0],
    //       [0, 1],
    //       [1, 1],
    //       [1, 0],
    //     ],
    //   },
    //   {
    //     axis: 1,
    //     fixedValue: 0,
    //     corners: [
    //       [-hw, -hh, hd],
    //       [-hw, -hh, -hd],
    //       [hw, -hh, -hd],
    //       [hw, -hh, hd],
    //     ],
    //     uvs: [
    //       [0, 1],
    //       [0, 0],
    //       [1, 0],
    //       [1, 1],
    //     ],
    //   },
    //   // Left/right: axis 2, sample (fixedValue, v, t)
    //   {
    //     axis: 2,
    //     fixedValue: 1,
    //     corners: [
    //       [hw, -hh, hd],
    //       [hw, -hh, -hd],
    //       [hw, hh, -hd],
    //       [hw, hh, hd],
    //     ],
    //     uvs: [
    //       [0, 0],
    //       [0, 1],
    //       [1, 1],
    //       [1, 0],
    //     ],
    //   },
    //   {
    //     axis: 2,
    //     fixedValue: 0,
    //     corners: [
    //       [-hw, -hh, -hd],
    //       [-hw, -hh, hd],
    //       [-hw, hh, hd],
    //       [-hw, hh, -hd],
    //     ],
    //     uvs: [
    //       [0, 0],
    //       [0, 1],
    //       [1, 1],
    //       [1, 0],
    //     ],
    //   },
    // ];

    // for (const def of faceDefs) {
    //   const geo = quadGeometry(def.corners, def.uvs);
    //   const mat = makeShellMaterial(texture, { axis: def.axis, fixedValue: def.fixedValue, scrubT: 0 });
    //   const mesh = new THREE.Mesh(geo, mat);
    //   console.log('✌️mes--->', mesh.id, mesh.uuid);

    //   if (mesh.id === 12) continue;
    //   if (mesh.id === 13) continue;
    //   if (mesh.id === 14) continue;
    //   if (mesh.id === 15) continue;
    //   if (mesh.id === 16) continue;
    //   // console.log(`1 Mesh id: ${mesh.id},mesh uuid: ${mesh.uuid}`);
    //   this.group.add(mesh);
    //   // this.shellMaterials.push(mat);
    // }

    // Internal ghost stack: thin frame planes spanning the front/back (x,y) extent,
    // distributed along the time (z) axis from back (t=0) to front (t=1). Opacity
    // is recomputed per-plane in setScrub() based on the current scrub position.
    this.ghostMaterials = [];
    this.ghostTimes = [];
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
      const mat = makeGhostMaterial(texture, t, 0, this.motionThreshold);
      const mesh = new THREE.Mesh(ghostGeo, mat);
      mesh.position.z = z;
      this.group.add(mesh);
      this.ghostMaterials.push(mat);
      this.ghostTimes.push(t);
      // if (i === 14) console.log(`Mesh id: ${mesh.id},mesh uuid: ${mesh.uuid}`);
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
    this._t = t;

    for (const mat of this.shellMaterials) mat.uniforms.uScrubT.value = t;

    for (let i = 0; i < this.ghostMaterials.length; i++) {
      const ti = this.ghostTimes[i];
      let opacity;
      if (ti < t - 1e-4) {
        opacity = 0; // already scrubbed past / emptied out
      } else {
        const peak = Math.exp(-(((t - ti) / this.peakWidth) ** 2));
        opacity = this.trailOpacity + (this.peakOpacity - this.trailOpacity) * peak;
      }
      this.ghostMaterials[i].uniforms.uOpacity.value = opacity;
    }
  }

  setTrailOpacity(opacity) {
    this.trailOpacity = opacity;
    this.setScrub(this._t);
  }

  // Lower = show more of the frame (less filtering); higher = only pixels that
  // stand out from that spot's average color across the clip stay visible
  // (fireworks, moving subjects, ...). Applied live in the ghost shader, so no
  // re-extraction is needed when you move this.
  setMotionThreshold(threshold) {
    this.motionThreshold = threshold;
    for (const mat of this.ghostMaterials) mat.uniforms.uMotionThreshold.value = threshold;
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.texture.dispose();
  }
}
