import * as THREE from 'three';

export const ELEMENT_STYLE = {
  C: { color: '#9fb4c8', size: 0.19 },
  O: { color: '#ff7d73', size: 0.2 },
  H: { color: '#dfeaf5', size: 0.11 },
  P: { color: '#f2bd66', size: 0.24 },
  N: { color: '#7ab4ff', size: 0.2 },
  Mg: { color: '#7ef0d7', size: 0.28 },
};

export const GROUP_COLORS = {
  phosphate: '#f2bd66',
  hydroxyl: '#7ef0d7',
  carbonyl: '#ff7d73',
  electronCarrier: '#7ab4ff',
  backbone: '#9fb4c8',
};

export const STAGE_COLORS = {
  investment: '#f0a264',
  payoff: '#7ef0d7',
};

export const cloneVector = (position) => new THREE.Vector3(...position);

export const lerpArray = (from, to, alpha) => [
  THREE.MathUtils.lerp(from[0], to[0], alpha),
  THREE.MathUtils.lerp(from[1], to[1], alpha),
  THREE.MathUtils.lerp(from[2], to[2], alpha),
];

export const mixColors = (base, overlay, amount) => {
  const baseColor = new THREE.Color(base);
  const overlayColor = new THREE.Color(overlay);
  return `#${baseColor.lerp(overlayColor, amount).getHexString()}`;
};

export const centerOfAtoms = (atoms) => {
  const total = atoms.reduce(
    (accumulator, atom) => {
      accumulator.x += atom.position[0];
      accumulator.y += atom.position[1];
      accumulator.z += atom.position[2];
      return accumulator;
    },
    { x: 0, y: 0, z: 0 },
  );

  return [
    total.x / atoms.length || 0,
    total.y / atoms.length || 0,
    total.z / atoms.length || 0,
  ];
};
