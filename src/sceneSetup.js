import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 100);

  // Camera is driven directly by mouse/trackpad via OrbitControls: drag to orbit,
  // scroll/pinch to zoom (including flying all the way through the cube's faces
  // to the inside). Shift+scroll is reserved for scrubbing frames instead.
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = true;
  controls.zoomSpeed = 1.1;
  controls.minDistance = 0.02;
  controls.maxDistance = 20;
  controls.target.set(0, 0, 0);

  return { renderer, scene, camera, controls };
}

export function bindResize(renderer, camera) {
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();
}

// While Shift is held, hand the wheel over to frame-scrubbing instead of camera zoom.
export function bindShiftToDisableZoom(controls) {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Shift") controls.enableZoom = false;
  });
  window.addEventListener("keyup", (event) => {
    if (event.key === "Shift") controls.enableZoom = true;
  });
  window.addEventListener("blur", () => {
    controls.enableZoom = true;
  });
}
