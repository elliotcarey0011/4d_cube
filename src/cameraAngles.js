// Camera presets captured by hand (drag the camera into place, log its
// position/rotation/quaternion, paste the values here). Only `position` and
// `zoom` are actually applied by applyCameraAngle — rotation/quaternion are
// kept alongside for reference if a preset needs to be re-derived later.
export const cameraAngles = {
  default: {
    position: { x: 2.192191795308033, y: 1.7206659592649027, z: -3.1422291115084273 },
    rotation: { isEuler: true, _x: -2.6405984990564373, _y: 0.5491359703520355, _z: 2.863198083447849, _order: "XYZ" },
    quaternion: { x: -0.062823399225291, y: 0.9328065794884673, z: 0.19984769819688167, w: 0.2932337008227625 },
  },
  top: {
    position: { x: 6.839953855022529e-7, y: 4.181084720495978, z: 0.000004124945316656096 },
    rotation: { x: -1.5707953402218915, y: 1.635928069537725e-7, z: 0.16432406181140152 },
    quaternion: { x: -0.7047210738653937, y: 0.05803201498745092, z: 0.05803195695288546, w: 0.7047217786181443 },
  },
  side: {
    position: { x: 3.995191373531822, y: 0.27019467522747037, z: 1.2670598748029005 },
    rotation: { x: -0.21009846853832595, y: 1.257218536946953, z: 0.20013126611614884 },
    quaternion: { x: -0.025969538638100958, y: 0.5903262841656844, z: 0.01900814183279582, w: 0.8065228774375369 },
  },
  front: {
    position: { x: 0.010609190706706788, y: 0.12755578234996182, z: 4.198049185926895 },
    rotation: { x: -0.030375239798919502, y: 0.002526044433327428, z: 0.00007675273054140423 },
    quaternion: {
      x: -0.015186975444693626,
      y: 0.001263459038798053,
      z: 0.000019190349919260052,
      w: 0.9998838727971513,
    },
  },
  back: {
    position: { x: 0.3941275844469985, y: 0.07683629124770976, z: -4.180760652264704 },
    rotation: { x: -3.1232161789789163, y: 0.09397817424683143, z: 3.1398680146019644 },
    quaternion: { x: -0.0004297494263594133, y: 0.9988540517891095, z: 0.009137459940846937, w: 0.04697771137187151 },
  },
  inside: {
    position: { x: 1.7947030376558417, y: 0.13907425204857435, z: 1.5840628054600756 },
    rotation: { x: -0.08757137741386092, y: 0.845754716264015, z: 0.06561843109175682 },
    quaternion: { x: -0.026445324978521617, y: 0.41108144297754445, z: 0.011931448638151624, w: 0.9111368352556467 },
    zoom: 2,
  },
};

export function applyCameraAngle(camera, controls, name, distance) {
  const angle = cameraAngles[name];
  if (!angle) return;

  camera.position.copy(angle.position).setLength(distance);
  camera.zoom = angle.zoom !== undefined ? angle.zoom : 1;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
}
