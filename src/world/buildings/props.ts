// Pembangun objek world builder — Phase 6.
// Tiap objek dirakit dari primitif Three.js (bukan file model eksternal),
// mengikuti gaya low-poly kota Phase 2. Dipakai createWorld untuk
// menggambar objek yang ditempatkan Bos lewat panel Builder.

import * as THREE from 'three';
import type { WorldObjectKind } from '../../types/worldObject';

function std(color: number, roughness = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

/** Pohon rindang (batang + tajuk icosahedron) — sama seperti pohon kota. */
export function makePropTree(scale = 1): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 0.9 * scale, 8), std(0x8a5a3b, 1));
  trunk.position.y = 0.45 * scale;
  trunk.castShadow = true;
  tree.add(trunk);
  const foliage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9 * scale, 0),
    new THREE.MeshStandardMaterial({ color: 0x4d7c4d, roughness: 1, flatShading: true }),
  );
  foliage.position.y = 1.5 * scale;
  foliage.castShadow = true;
  tree.add(foliage);
  return tree;
}

/** Bangku taman (duduk + sandaran + kaki) — sama seperti bangku kota. */
export function makePropBench(): THREE.Group {
  const bench = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), std(0x8a5a3b));
  seat.position.y = 0.45;
  seat.castShadow = true;
  bench.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.1), std(0x8a5a3b));
  back.position.set(0, 0.75, -0.22);
  back.castShadow = true;
  bench.add(back);
  [-0.65, 0.65].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.45), std(0x5b3a26));
    leg.position.set(x, 0.22, 0);
    bench.add(leg);
  });
  return bench;
}

/** Lampu taman (tiang + kepala bercahaya hangat). */
export function makePropLamp(): THREE.Group {
  const lamp = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.4, 8), std(0x3b4756, 0.6));
  pole.position.y = 1.2;
  pole.castShadow = true;
  lamp.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xfff2cc,
      emissive: 0xffedb0,
      emissiveIntensity: 0.9,
      roughness: 0.4,
    }),
  );
  head.position.y = 2.55;
  lamp.add(head);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.25, 12), std(0x3b4756, 0.6));
  cap.position.y = 2.85;
  lamp.add(cap);
  return lamp;
}

/** Air mancur (kolam bundar + kolom tengah + cakram air). */
export function makePropFountain(): THREE.Group {
  const fountain = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.5, 24), std(0x9aa5b1, 0.95));
  basin.position.y = 0.25;
  basin.castShadow = true;
  basin.receiveShadow = true;
  fountain.add(basin);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.06, 24),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, transparent: true, opacity: 0.85 }),
  );
  water.position.y = 0.48;
  fountain.add(water);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.9, 12), std(0x7d93a8));
  column.position.y = 0.9;
  column.castShadow = true;
  fountain.add(column);
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.15, transparent: true, opacity: 0.9 }),
  );
  top.position.y = 1.45;
  fountain.add(top);
  return fountain;
}

/** Bangun satu objek builder pada posisi + rotasi tertentu. */
export function buildWorldObject(kind: WorldObjectKind, x: number, z: number, rotY: number): THREE.Group {
  let group: THREE.Group;
  if (kind === 'tree') group = makePropTree();
  else if (kind === 'bench') group = makePropBench();
  else if (kind === 'lamp') group = makePropLamp();
  else group = makePropFountain();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  return group;
}
