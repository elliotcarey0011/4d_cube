import * as THREE from "three";
import { buildVideoVolume } from "./cube/volume.js";
import { SpacetimeCube } from "./cube/spacetimeCube.js";
import { dom } from "./ui/dom.js";
import { bindControls } from "./ui/controls.js";
import { bindKeyboardShortcuts } from "./ui/keyboardShortcuts.js";
import { createScene, bindResize, bindShiftToDisableZoom } from "./sceneSetup.js";
import { applyCameraAngle } from "./cameraAngles.js";

const INITIAL_CAMERA_DISTANCE = 4.2;

const { renderer, scene, camera, controls } = createScene(dom.canvas);
bindResize(renderer, camera);
bindShiftToDisableZoom(controls);
applyCameraAngle(camera, controls, "default", INITIAL_CAMERA_DISTANCE);

let cube = null;
let scrubT = 0;
let isPlaying = false;
let volumeInfo = null;

function updateScrubUI() {
  dom.scrubSlider.value = String(scrubT);
  if (volumeInfo) {
    const frame = Math.round(scrubT * (volumeInfo.frameCount - 1));
    const seconds = (scrubT * volumeInfo.duration).toFixed(2);
    dom.scrubReadout.textContent = `${frame + 1}/${volumeInfo.frameCount} · ${seconds}s`;
  }
}

function setScrub(t) {
  scrubT = THREE.MathUtils.clamp(t, 0, 1);
  cube?.setScrub(scrubT);
  updateScrubUI();
}

function togglePlay() {
  if (!cube) return;
  isPlaying = !isPlaying;
  dom.playPauseBtn.textContent = isPlaying ? "Pause" : "Play";
}

async function loadVideo(file) {
  dom.fileName.textContent = file.name;
  dom.loadingEl.classList.remove("hidden");
  dom.controlsEl.classList.add("hidden");
  dom.playPauseBtn.disabled = true;
  dom.progressFill.style.width = "0%";
  dom.loadingLabel.textContent = "Reading video…";

  if (cube) {
    scene.remove(cube.group);
    cube.dispose();
    cube = null;
  }

  try {
    const volume = await buildVideoVolume(file, {
      onProgress: (p) => {
        dom.progressFill.style.width = `${Math.round(p * 100)}%`;
        dom.loadingLabel.textContent = `Extracting frames… ${Math.round(p * 100)}%`;
      },
      anisotropy: renderer.capabilities.getMaxAnisotropy(),
    });
    volumeInfo = volume;

    cube = new SpacetimeCube(volume, {
      ghostCount: 48,
      trailOpacity: parseFloat(dom.opacitySlider.value),
      motionThreshold: parseFloat(dom.motionSlider.value),
      shellOpacity: parseFloat(dom.shellOpacitySlider.value),
      shellVisible: dom.shellCheckbox.checked,
    });
    scene.add(cube.group);

    scrubT = 0;
    setScrub(0);

    dom.controlsEl.classList.remove("hidden");
    dom.playPauseBtn.disabled = false;
    isPlaying = false;
    dom.playPauseBtn.textContent = "Play";
  } catch (err) {
    console.error(err);
    dom.loadingLabel.textContent = "Could not load that video.";
    dom.progressFill.style.width = "0%";
    return;
  } finally {
    dom.loadingEl.classList.add("hidden");
  }
}

bindControls(dom, {
  canScrub: () => Boolean(cube),
  onScrub: setScrub,
  onScrubBy: (delta) => setScrub(scrubT + delta),
  onTrailOpacity: (v) => cube?.setTrailOpacity(v),
  onMotionThreshold: (v) => cube?.setMotionThreshold(v),
  onShellVisible: (v) => cube?.setShellVisible(v),
  onShellOpacity: (v) => cube?.setShellOpacity(v),
  onTogglePlay: togglePlay,
  onCameraAngle: (name) => applyCameraAngle(camera, controls, name, INITIAL_CAMERA_DISTANCE),
  onFileSelected: loadVideo,
});

bindKeyboardShortcuts({
  canScrub: () => Boolean(cube && volumeInfo),
  frameStep: () => 1 / Math.max((volumeInfo?.frameCount ?? 1) - 1, 1),
  onTogglePlay: togglePlay,
  onScrubBy: (delta) => setScrub(scrubT + delta),
  onScrubTo: setScrub,
});

// Dev convenience: auto-load a local test clip on startup so there's no need to
// re-pick a file on every reload. Stripped out of production builds.
if (import.meta.env.DEV) {
  fetch("/files/test_video_3.mp4")
    .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(`${res.status} ${res.statusText}`))))
    .then((blob) => loadVideo(new File([blob], "test_video_3.mp4", { type: blob.type || "video/mp4" })))
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
