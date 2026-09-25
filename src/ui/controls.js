// Wires every HUD control (sliders, checkbox, buttons, file input, and the
// shift+wheel scrub gesture) to the plain callbacks main.js supplies. This
// module owns simple 1:1 UI feedback (readout text mirroring a slider's own
// value); anything that depends on shared playback state (e.g. the scrub
// readout, which also shows frame/time) is left to the caller.
export function bindControls(dom, callbacks) {
  const {
    canScrub,
    onScrub,
    onScrubBy,
    onTrailOpacity,
    onMotionThreshold,
    onShellVisible,
    onShellOpacity,
    onTogglePlay,
    onCameraAngle,
    onFileSelected,
  } = callbacks;

  dom.canvas.addEventListener(
    "wheel",
    (event) => {
      if (!canScrub() || !event.shiftKey) return; // plain scroll/pinch is left to OrbitControls for zoom
      event.preventDefault();
      onScrubBy(event.deltaY * 0.00045);
    },
    { passive: false }
  );

  dom.scrubSlider.addEventListener("input", () => onScrub(parseFloat(dom.scrubSlider.value)));

  dom.opacitySlider.addEventListener("input", () => {
    dom.opacityReadout.textContent = dom.opacitySlider.value;
    onTrailOpacity(parseFloat(dom.opacitySlider.value));
  });

  dom.motionSlider.addEventListener("input", () => {
    dom.motionReadout.textContent = dom.motionSlider.value;
    onMotionThreshold(parseFloat(dom.motionSlider.value));
  });

  dom.shellCheckbox.addEventListener("change", () => onShellVisible(dom.shellCheckbox.checked));

  dom.shellOpacitySlider.addEventListener("input", () => {
    dom.shellOpacityReadout.textContent = dom.shellOpacitySlider.value;
    onShellOpacity(parseFloat(dom.shellOpacitySlider.value));
  });

  dom.playPauseBtn.addEventListener("click", onTogglePlay);

  dom.cameraAngleBtnDefault.addEventListener("click", () => onCameraAngle("default"));
  dom.cameraAngleBtnTop.addEventListener("click", () => onCameraAngle("top"));
  dom.cameraAngleBtnFront.addEventListener("click", () => onCameraAngle("front"));
  dom.cameraAngleBtnSide.addEventListener("click", () => onCameraAngle("side"));
  dom.cameraAngleBtnInside.addEventListener("click", () => onCameraAngle("inside"));
  dom.cameraAngleBtnBack.addEventListener("click", () => onCameraAngle("back"));

  dom.fileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
  });
}
