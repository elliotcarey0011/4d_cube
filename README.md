# 4D Cube — spacetime video cube

A browser toy that turns a video into a "spacetime cube": every frame is
stacked along a depth (time) axis so you can orbit around — and fly straight
through — the video's own timeline.

preview: https://4d-cube-ruddy.vercel.app/

## How it works

The video is decoded client-side into a 3D volume texture indexed by
`(x, y, time)`. A three.js box is built from 6 custom-shaded faces: the
front/back faces show the current frame, while the top/bottom/left/right
faces sample x‑t and y‑t slices of the volume — that's what produces the
melting motion-streak look on the cube's sides. Inside the box sits a stack
of low-opacity frame planes along the time axis, so flying into the cube
reveals overlapping translucent frames rather than one solid image.

## Getting started

Requires Node 18+.

```bash
npm install
npm run dev
```

Open the printed local URL and click **Import video** to load any video file
from disk. Everything — frame extraction, the volume texture, rendering —
happens in the browser; nothing is uploaded anywhere.

## Scripts

| Command                | Description                                 |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Start the Vite dev server                   |
| `npm run build`        | Type-check-free production build to `dist/` |
| `npm run preview`      | Preview the production build locally        |
| `npm run lint`         | Lint the codebase with ESLint               |
| `npm run lint:fix`     | Lint and auto-fix what ESLint can           |
| `npm run format`       | Format the codebase with Prettier           |
| `npm run format:check` | Check formatting without writing changes    |

## Controls

- **Import video** — loads any video file, extracts frames client-side (progress bar shown)
- **Drag** — orbits the camera around the cube
- **Scroll / pinch** — zooms in and out, including flying straight through the cube's faces to the inside
- **Shift+Scroll**, **←/→**, or the **Time** slider — scrubs through frames
- **Space** or **k** — play/pause; auto-scrubs through the video in real time
- **Home / End** — jump to the start / end of the clip
- **Trail opacity** — how visible the internal translucent frame stack is
- **Shell** — show/hide the outer time-slice faces, and control their opacity
- **Isolate motion** — raises the bar for which pixels count as "moving," isolating motion/contrast from a mostly-static background

## Project structure

```
index.html              HTML shell + HUD markup
src/
  main.js                Entry point: wires the scene, cube, and UI together; runs the render loop
  sceneSetup.js           Renderer/scene/camera/OrbitControls setup
  cameraAngles.js         Named camera presets + the function that applies them
  style.css               HUD styling
  cube/
    volume.js              Decodes a video file into a THREE.Data3DTexture volume
    spacetimeCube.js        Builds the cube mesh (shell faces + ghost frame stack) from a volume
    cubeShaders.js           GLSL shaders for the shell and ghost-plane materials
  ui/
    dom.js                  Central lookup of HUD DOM elements
    controls.js              Wires sliders/buttons/checkboxes to callbacks
    keyboardShortcuts.js      Keyboard shortcut handling
```

## Tech stack

[Vite](https://vitejs.dev/) + [three.js](https://threejs.org/), no framework.
Linting via [ESLint](https://eslint.org/) (flat config), formatting via
[Prettier](https://prettier.io/).

## Known limitations

- The whole clip is decoded and kept in memory as a volume texture, so very
  long or high-resolution videos will be slow to import and heavy on GPU
  memory (frame count and texture resolution are both capped in `volume.js`
  to keep this reasonable).
- Extraction relies on the browser being able to decode the video format via
  `<video>`/`<canvas>` — most common web codecs (H.264 mp4, WebM/VP9, etc.)
  work; obscure or unsupported codecs may fail to load.
