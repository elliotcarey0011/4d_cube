// Keyboard shortcuts for moving through the video. Ignored while a form
// control (e.g. a slider) has focus so native input keybinds aren't
// double-handled.
export function bindKeyboardShortcuts({ canScrub, frameStep, onTogglePlay, onScrubBy, onScrubTo }) {
  window.addEventListener("keydown", (event) => {
    if (!canScrub()) return;
    if (event.target instanceof HTMLInputElement) return;

    const step = frameStep();
    const bigStep = step * 10;

    switch (event.key) {
      case " ":
      case "k":
        event.preventDefault();
        onTogglePlay();
        break;
      case "ArrowRight":
      case "l":
        event.preventDefault();
        onScrubBy(event.shiftKey ? bigStep : step);
        break;
      case "ArrowLeft":
      case "j":
        event.preventDefault();
        onScrubBy(-(event.shiftKey ? bigStep : step));
        break;
      case "Home":
        event.preventDefault();
        onScrubTo(0);
        break;
      case "End":
        event.preventDefault();
        onScrubTo(1);
        break;
    }
  });
}
