// Dev-only convenience: lets you switch between the local sample clips in
// files/ via a dropdown instead of re-picking a file from disk every reload.
// A no-op in production builds — `import.meta.env.DEV` is statically false
// there, so this bails out before touching the (hidden) dropdown.
export function bindDevTools(dom, { onFileSelected }) {
  if (!import.meta.env.DEV) return;

  dom.devTools.classList.remove("hidden");

  function loadTestFile(filename) {
    fetch(`/files/${filename}`)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(`${res.status} ${res.statusText}`))))
      .then((blob) => onFileSelected(new File([blob], filename, { type: blob.type || "video/mp4" })))
      .catch((err) => console.warn("Dev test file not loaded:", err));
  }

  dom.devTestFileSelect.addEventListener("change", () => loadTestFile(dom.devTestFileSelect.value));
  loadTestFile(dom.devTestFileSelect.value);
}
