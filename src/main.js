import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildVideoVolume } from "./volume.js";
import { SpacetimeCube } from "./spacetimeCube.js";

const canvas = document.getElementById("scene");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const playPauseBtn = document.getElementById("playPauseBtn");
const cameraAngleBtnDefault = document.getElementById("cameraAngleBtnDefault");
const cameraAngleBtnTop = document.getElementById("cameraAngleBtnTop");
const cameraAngleBtnSide = document.getElementById("cameraAngleBtnSide");
const cameraAngleBtnFront = document.getElementById("cameraAngleBtnFront");
const cameraAngleBtnInside = document.getElementById("cameraAngleBtnInside");
const loadingEl = document.getElementById("loading");
const loadingLabel = document.getElementById("loadingLabel");
const progressFill = document.getElementById("progressFill");
const controlsEl = document.getElementById("controls");
const scrubSlider = document.getElementById("scrubSlider");
const scrubReadout = document.getElementById("scrubReadout");
const opacitySlider = document.getElementById("opacitySlider");
const opacityReadout = document.getElementById("opacityReadout");
const cameraAngleData = {
  default: { position: { x: 0.010609190706706788, y: 0.12755578234996182, z: 4.198049185926895 }, rotation: { x: -0.030375239798919502, y: 0.002526044433327428, z: 0.00007675273054140423 }, quaternion: { x: -0.015186975444693626, y: 0.001263459038798053, z: 0.000019190349919260052, w: 0.9998838727971513 } },
  top: { position: { x: 6.839953855022529e-7, y: 4.181084720495978, z: 0.000004124945316656096 }, rotation: { x: -1.5707953402218915, y: 1.635928069537725e-7, z: 0.16432406181140152 }, quaternion: { x: -0.7047210738653937, y: 0.05803201498745092, z: 0.05803195695288546, w: 0.7047217786181443 } },
  side: { position: { x: 3.995191373531822, y: 0.27019467522747037, z: 1.2670598748029005 }, rotation: { x: -0.21009846853832595, y: 1.257218536946953, z: 0.20013126611614884 }, quaternion: { x: -0.025969538638100958, y: 0.5903262841656844, z: 0.01900814183279582, w: 0.8065228774375369 } },
  front: { position: { x: 0.010609190706706788, y: 0.12755578234996182, z: 4.198049185926895 }, rotation: { x: -0.030375239798919502, y: 0.002526044433327428, z: 0.00007675273054140423 }, quaternion: { x: -0.015186975444693626, y: 0.001263459038798053, z: 0.000019190349919260052, w: 0.9998838727971513 } },
  inside: { position: { x: 1.7947030376558417, y: 0.13907425204857435, z: 1.5840628054600756 }, rotation: { x: -0.08757137741386092, y: 0.845754716264015, z: 0.06561843109175682 }, quaternion: { x: -0.026445324978521617, y: 0.41108144297754445, z: 0.011931448638151624, w: 0.9111368352556467 }, zoom: 2 }
};
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 100);
const initialDistance = 4.2;

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


function applyCameraAngle(name, distance = initialDistance) {
  const angle = cameraAngleData[name];
  if (!angle) return;

  camera.position.copy(angle.position).setLength(distance);
  if (angle.zoom !== undefined) {
    camera.zoom = angle.zoom;
  } else {
    camera.zoom = 1;
  }
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
}
applyCameraAngle("default");
// While Shift is held, hand the wheel over to frame-scrubbing instead of camera zoom.
window.addEventListener("keydown", (event) => {
  if (event.key === "Shift") controls.enableZoom = false;
});
window.addEventListener("keyup", (event) => {
  if (event.key === "Shift") controls.enableZoom = true;
});
window.addEventListener("blur", () => {
  controls.enableZoom = true;
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

let cube = null;
let scrubT = 0;
let isPlaying = false;
let volumeInfo = null;

function updateScrubUI() {
  scrubSlider.value = String(scrubT);
  if (volumeInfo) {
    const frame = Math.round(scrubT * (volumeInfo.frameCount - 1));
    const seconds = (scrubT * volumeInfo.duration).toFixed(2);
    scrubReadout.textContent = `${frame + 1}/${volumeInfo.frameCount} · ${seconds}s`;
  }
}

function updateOpacityUI() {
  opacityReadout.textContent = opacitySlider.value;
}
function setScrub(t) {
  scrubT = THREE.MathUtils.clamp(t, 0, 1);
  cube?.setScrub(scrubT);
  updateScrubUI();
}

canvas.addEventListener(
  "wheel",
  (event) => {
    if (!cube || !event.shiftKey) return; // plain scroll/pinch is left to OrbitControls for zoom
    event.preventDefault();
    setScrub(scrubT + event.deltaY * 0.00045);
  },
  { passive: false }
);

scrubSlider.addEventListener("input", () => setScrub(parseFloat(scrubSlider.value)));
opacitySlider.addEventListener("input", () => {
  cube?.setTrailOpacity(parseFloat(opacitySlider.value));
  updateOpacityUI();
});

function togglePlay() {
  if (!cube) return;
  isPlaying = !isPlaying;
  playPauseBtn.textContent = isPlaying ? "Pause" : "Play";
}
playPauseBtn.addEventListener("click", togglePlay);

cameraAngleBtnDefault.addEventListener("click", () => applyCameraAngle("default"));
cameraAngleBtnTop.addEventListener("click", () => applyCameraAngle("top"));
cameraAngleBtnFront.addEventListener("click", () => applyCameraAngle("front"));
cameraAngleBtnSide.addEventListener("click", () => applyCameraAngle("side"));
cameraAngleBtnInside.addEventListener("click", () => applyCameraAngle("inside"));
// Keyboard shortcuts for moving through the video. Ignored while a form control
// (e.g. a slider) has focus so native input keybinds aren't double-handled.
window.addEventListener("keydown", (event) => {
  if (!cube || !volumeInfo) return;
  if (event.target instanceof HTMLInputElement) return;

  const frameStep = 1 / Math.max(volumeInfo.frameCount - 1, 1);
  const bigStep = frameStep * 10;

  switch (event.key) {
    case " ":
    case "k":
      event.preventDefault();
      togglePlay();
      break;
    case "ArrowRight":
    case "l":
      event.preventDefault();
      setScrub(scrubT + (event.shiftKey ? bigStep : frameStep));
      break;
    case "ArrowLeft":
    case "j":
      event.preventDefault();
      setScrub(scrubT - (event.shiftKey ? bigStep : frameStep));
      break;
    case "Home":
      event.preventDefault();
      setScrub(0);
      break;
    case "End":
      event.preventDefault();
      setScrub(1);
      break;
  }
});

async function loadVideo(file) {
  fileName.textContent = file.name;
  loadingEl.classList.remove("hidden");
  controlsEl.classList.add("hidden");
  playPauseBtn.disabled = true;
  progressFill.style.width = "0%";
  loadingLabel.textContent = "Reading video…";

  if (cube) {
    scene.remove(cube.group);
    cube.dispose();
    cube = null;
  }

  try {
    const volume = await buildVideoVolume(file, {
      onProgress: (p) => {
        progressFill.style.width = `${Math.round(p * 100)}%`;
        loadingLabel.textContent = `Extracting frames… ${Math.round(p * 100)}%`;
      },
      anisotropy: renderer.capabilities.getMaxAnisotropy(),
    });
    volumeInfo = volume;

    cube = new SpacetimeCube(volume, { ghostCount: 48, trailOpacity: parseFloat(opacitySlider.value) });
    scene.add(cube.group);

    scrubT = 0;
    setScrub(0);
    // camera.position.set(2.6, 1.9, 3.1).setLength(initialDistance);
    // camera.position.set(0.010609190706706788, 0.12755578234996182, 4.198049185926895).setLength(initialDistance);
    // camera.rotation.set(-0.030375239798919502, 0.002526044433327428, 0.00007675273054140423);
    // camera.quaternion.set(
    //   -0.015186975444693626,
    //   0.001263459038798053,
    //   0.000019190349919260052,
    //   0.9998838727971513
    // );
    // controls.target.set(0, 0, 0);

    controlsEl.classList.remove("hidden");
    playPauseBtn.disabled = false;
    isPlaying = false;
    playPauseBtn.textContent = "Play";
  } catch (err) {
    console.error(err);
    loadingLabel.textContent = "Could not load that video.";
    progressFill.style.width = "0%";
    return;
  } finally {
    loadingEl.classList.add("hidden");
  }
}

fileInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) loadVideo(file);
});

// Dev convenience: auto-load a local test clip on startup so there's no need to
// re-pick a file on every reload. Stripped out of production builds.
if (import.meta.env.DEV) {
  fetch("/files/test_video_1.mp4")
    .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(`${res.status} ${res.statusText}`))))
    .then((blob) => loadVideo(new File([blob], "test_video_1.mp4", { type: blob.type || "video/mp4" })))
    .catch((err) => console.warn("Dev default video not loaded:", err));
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (isPlaying && volumeInfo) {
    const speed = 1 / Math.max(volumeInfo.duration, 0.05);
    let next = scrubT + dt * speed;
    if (next >= 1) next -= 1;
    setScrub(next);
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();
