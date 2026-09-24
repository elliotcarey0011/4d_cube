import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildVideoVolume } from "./volume.js";
import { SpacetimeCube } from "./spacetimeCube.js";

const canvas = document.getElementById("scene");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const playPauseBtn = document.getElementById("playPauseBtn");
const loadingEl = document.getElementById("loading");
const loadingLabel = document.getElementById("loadingLabel");
const progressFill = document.getElementById("progressFill");
const controlsEl = document.getElementById("controls");
const scrubSlider = document.getElementById("scrubSlider");
const scrubReadout = document.getElementById("scrubReadout");
const opacitySlider = document.getElementById("opacitySlider");
const flySlider = document.getElementById("flySlider");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 100);
const initialDistance = 4.2;
camera.position.set(2.6, 1.9, 3.1).setLength(initialDistance);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enableZoom = false; // wheel is repurposed for scrubbing / shift+wheel for flying inside
controls.minDistance = 0.02;
controls.maxDistance = 20;
controls.target.set(0, 0, 0);

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

function setDistance(dist) {
  dist = THREE.MathUtils.clamp(dist, controls.minDistance, controls.maxDistance);
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
  if (dir.lengthSq() < 1e-8) dir.set(0, 0, 1);
  dir.setLength(dist);
  camera.position.copy(controls.target).add(dir);
  flySlider.value = String(dist);
}

function currentDistance() {
  return camera.position.distanceTo(controls.target);
}

function updateScrubUI() {
  scrubSlider.value = String(scrubT);
  if (volumeInfo) {
    const frame = Math.round(scrubT * (volumeInfo.frameCount - 1));
    const seconds = (scrubT * volumeInfo.duration).toFixed(2);
    scrubReadout.textContent = `${frame + 1}/${volumeInfo.frameCount} · ${seconds}s`;
  }
}

function setScrub(t) {
  scrubT = THREE.MathUtils.clamp(t, 0, 1);
  cube?.setScrub(scrubT);
  updateScrubUI();
}

canvas.addEventListener(
  "wheel",
  (event) => {
    if (!cube) return;
    event.preventDefault();
    if (event.shiftKey) {
      const dist = currentDistance();
      const delta = event.deltaY * 0.0025 * Math.max(dist, 0.05);
      setDistance(dist + delta);
    } else {
      setScrub(scrubT + event.deltaY * 0.00045);
    }
  },
  { passive: false }
);

scrubSlider.addEventListener("input", () => setScrub(parseFloat(scrubSlider.value)));
opacitySlider.addEventListener("input", () => cube?.setGhostOpacity(parseFloat(opacitySlider.value)));
flySlider.addEventListener("input", () => setDistance(parseFloat(flySlider.value)));

playPauseBtn.addEventListener("click", () => {
  isPlaying = !isPlaying;
  playPauseBtn.textContent = isPlaying ? "Pause" : "Play";
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

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
    });
    volumeInfo = volume;

    cube = new SpacetimeCube(volume, { ghostCount: 48, ghostOpacity: parseFloat(opacitySlider.value) });
    scene.add(cube.group);

    scrubT = 0;
    setScrub(0);
    setDistance(initialDistance);

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
});

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
