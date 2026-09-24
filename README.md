
How it works — this replicates the "spacetime cube" effect from your reference images: the video is decoded client-side into a 3D volume texture indexed by (x, y, time). A three.js box is built from 6 custom-shaded faces: the front/back faces show the current frame, while the top/bottom/left/right faces sample x‑t and y‑t slices of the volume — that's what produces the melting motion-streak look on the cube's sides. Inside the box sits a stack of ~48 low-opacity frame planes along the time axis, so flying into the cube reveals overlapping translucent frames rather than one solid image.

Controls:
- Import video — loads any video file, extracts frames client-side (progress bar shown)
- Scroll — scrubs through frames (moves the front face's current frame)
- Drag — orbits the camera around the cube
- Shift+Scroll (or the Distance slider) — flies the camera in/out, including straight through the cube's faces to the inside
- Ghost opacity slider — controls how visible the internal translucent frame stack is
- Play/Pause — auto-scrubs through the video in real time

I