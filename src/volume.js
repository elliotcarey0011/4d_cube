import * as THREE from "three";

/**
 * Samples a video file into a stack of frames and packs them into a
 * THREE.Data3DTexture with axes (x, y, t) so the cube shader can read
 * arbitrary (x,y) images or (x,t)/(y,t) time-slices out of it.
 */
export async function buildVideoVolume(file, { onProgress, anisotropy } = {}) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  await new Promise((resolve, reject) => {
    video.addEventListener("loadedmetadata", resolve, { once: true });
    video.addEventListener("error", () => reject(new Error("Could not load video")), { once: true });
  });

  const duration = Math.max(video.duration || 0, 0.05);
  const srcAspect = video.videoWidth / video.videoHeight || 16 / 9;

  // Sample at ~12fps, clamped to a sane frame-count range for GPU memory / extraction time.
  const frameCount = Math.min(180, Math.max(24, Math.round(duration * 12)));

  // Downsample resolution used for the volume texture — capped for memory/extraction
  // time, but never upscaled past the source video's own resolution.
  const maxTexW = 384;
  const texW = Math.max(2, Math.min(maxTexW, video.videoWidth || maxTexW));
  const texH = Math.max(2, Math.round(texW / srcAspect));

  const canvas = document.createElement("canvas");
  canvas.width = texW;
  canvas.height = texH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const data = new Uint8Array(texW * texH * 4 * frameCount);

  for (let i = 0; i < frameCount; i++) {
    const t = frameCount === 1 ? 0 : (i / (frameCount - 1)) * (duration - 0.001);
    await seekTo(video, t);

    ctx.clearRect(0, 0, texW, texH);
    ctx.drawImage(video, 0, 0, texW, texH);
    const frame = ctx.getImageData(0, 0, texW, texH).data;

    // Data3DTexture layer i; flip rows so v=0 is the bottom of the image (matches
    // standard GL texture V convention used by the plane UVs in the shaders).
    const layerOffset = i * texW * texH * 4;
    for (let row = 0; row < texH; row++) {
      const srcRow = texH - 1 - row;
      const srcStart = srcRow * texW * 4;
      const dstStart = layerOffset + row * texW * 4;
      data.set(frame.subarray(srcStart, srcStart + texW * 4), dstStart);
    }

    onProgress?.((i + 1) / frameCount);
    // Yield to the event loop so the progress bar can repaint.
    await new Promise((r) => setTimeout(r, 0));
  }

  URL.revokeObjectURL(url);

  const texture = new THREE.Data3DTexture(data, texW, texH, frameCount);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.wrapR = THREE.ClampToEdgeWrapping;
  // Sharpens the shell faces, which are mostly viewed at steep/grazing angles
  // (the time-slice surfaces recede directly away from the camera).
  if (anisotropy) texture.anisotropy = anisotropy;
  texture.needsUpdate = true;

  return {
    texture,
    frameCount,
    aspect: srcAspect,
    duration,
    sourceVideo: video,
    sourceUrl: url,
  };
}

function seekTo(video, time) {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}
