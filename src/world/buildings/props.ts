// Pembangun objek world builder — Phase 6.
// Tiap objek dirakit dari primitif Three.js (bukan file model eksternal),
// mengikuti gaya low-poly kota Phase 2. Dipakai createWorld untuk
// menggambar objek yang ditempatkan Bos lewat panel Builder.
//
// Phase 8.3: katalog 4 → 21 item. Bagian berulang DALAM satu objek
// (kios pasar, roda mobil, bunga, kursi ayunan) memakai InstancedMesh.
// Pembangun district.ts TIDAK dipakai ulang langsung — pembangun di sana
// menaruh grup di koordinat tetap, sedangkan objek Builder harus
// berpusat di titik asal supaya bisa ditempatkan di mana saja; pola
// bentuknya yang dipakai ulang. Hewan (kucing/anjing/bebek) tidak
// dibangun di sini — dirender BuilderAnimals.

import * as THREE from 'three';
import type { WorldObjectKind } from '../../types/worldObject';
import { gableRoofMesh, glassMaterial, WARM_ROOF_COLORS } from './city';

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

/** InstancedMesh lokal (bagian berulang dalam SATU objek) — pola yang
 *  sama seperti district.ts, tapi mandiri supaya props.ts tidak
 *  bergantung pada city.ts. */
function instanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  matrices: THREE.Matrix4[],
  castShadow = false,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.castShadow = castShadow;
  mesh.receiveShadow = false;
  return mesh;
}

function composeMatrix(
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
  return m;
}

/** Menara kaca (8.3): badan transparan mengilap + pelat atap + antena. */
export function makePropGlassTower(): THREE.Group {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(3, 8, 3),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.55,
      roughness: 0.12,
      metalness: 0.25,
    }),
  );
  glass.position.y = 4;
  glass.receiveShadow = false;
  g.add(glass);
  // Phase 9: mahkota limas kaca (dulu pelat datar 0x334155).
  const crown = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.4, 4), glassMaterial());
  crown.rotation.y = Math.PI / 4;
  crown.position.y = 8.7;
  g.add(crown);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), std(0x3b4756, 0.6));
  antenna.position.y = 9.1;
  g.add(antenna);
  return g;
}

/** Gedung kantor kecil (8.3): kotak berjendela, lebih kecil dari kantor pusat. */
export function makePropOffice(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 5.5, 4.5), std(0x7d93a8));
  body.position.y = 2.75;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // Phase 9: atap pelana oranye (dulu pelat datar 0x334155).
  const roof = gableRoofMesh(5.1, 5.1, 2.0, WARM_ROOF_COLORS.orange);
  roof.position.y = 5.5 + 2.0 / 3;
  g.add(roof);
  const windows = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 3.6, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.3 }),
  );
  windows.position.set(0, 2.9, 2.28);
  g.add(windows);
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 2),
    new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.6 }),
  );
  door.position.set(0, 1, 2.29);
  g.add(door);
  return g;
}

/** Toko (8.3): badan ungu + awning + papan nama + pintu. */
export function makePropShop(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3, 3), std(0x8b5cf6));
  body.position.y = 1.5;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 1.2), std(0xec4899));
  awning.position.set(0, 2.4, 1.8);
  awning.rotation.x = -0.25;
  g.add(awning);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), std(0xf8fafc, 0.7));
  sign.position.set(0, 2.75, 1.53);
  g.add(sign);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), std(0x2b3a4a, 0.6));
  door.position.set(0, 1, 1.53);
  g.add(door);
  return g;
}

/** Rumah (8.3): seperti rumah residensial — badan + atap limas + pintu. */
export function makePropHouse(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3.5), std(0xe07a5f));
  body.position.y = 1.5;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.4, 1.6, 4),
    new THREE.MeshStandardMaterial({ color: 0x8a4a3b, roughness: 1, flatShading: true }),
  );
  roof.position.y = 3.8;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), std(0x2b3a4a, 0.6));
  door.position.set(0, 0.9, 1.78);
  g.add(door);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), std(0x94a3b8));
  chimney.position.set(1.2, 4.2, -0.8);
  g.add(chimney);
  return g;
}

/** Sekolah (8.3): badan kuning + atap + pintu + tiang bendera. */
export function makePropSchool(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 4.5), std(0xf2c14e));
  body.position.y = 1.75;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // Phase 9: atap pelana merah bata (dulu pelat datar 0x8a4a3b).
  const roof = gableRoofMesh(6.6, 5.1, 2.0, WARM_ROOF_COLORS.brick);
  roof.position.y = 3.5 + 2.0 / 3;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), std(0x2b3a4a, 0.6));
  door.position.set(0, 1.1, 2.28);
  g.add(door);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 8), std(0x3b4756, 0.6));
  pole.position.set(2.4, 1.7, 2);
  g.add(pole);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide, roughness: 0.8 }),
  );
  flag.position.set(2.82, 3.15, 2);
  flag.rotation.y = Math.PI / 2;
  g.add(flag);
  return g;
}

/** Klinik (8.3): badan putih + atap + salib merah + pintu. */
export function makePropClinic(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 4), std(0xf8fafc));
  body.position.y = 1.6;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // Phase 9: atap pelana hijau toska (dulu pelat datar 0x64748b).
  const roof = gableRoofMesh(6.1, 4.6, 1.8, WARM_ROOF_COLORS.teal);
  roof.position.y = 3.2 + 1.8 / 3;
  g.add(roof);
  const crossMat = std(0xef4444, 0.6);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.12), crossMat);
  crossV.position.set(0, 2.4, 2.05);
  g.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.12), crossMat);
  crossH.position.set(0, 2.4, 2.05);
  g.add(crossH);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2), std(0x2b3a4a, 0.6));
  door.position.set(0, 1, 2.05);
  g.add(door);
  return g;
}

/** Masjid kecil (8.3): badan krem + kubah hijau + menara. */
export function makePropMosque(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 3.5, 4.5), std(0xf5f0e6));
  body.position.y = 1.75;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    std(0x16a34a, 0.7),
  );
  dome.position.y = 3.5;
  dome.castShadow = true;
  g.add(dome);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), std(0xf59e0b, 0.5));
  spire.position.y = 5.5;
  g.add(spire);
  const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 6.5, 12), std(0xf5f0e6));
  minaret.position.set(-2.2, 3.25, -1.6);
  minaret.castShadow = true;
  g.add(minaret);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1, 12), std(0x16a34a, 0.7));
  cone.position.set(-2.2, 7, -1.6);
  g.add(cone);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2), std(0x2b3a4a, 0.6));
  door.position.set(0, 1, 2.28);
  g.add(door);
  return g;
}

/** Taman bermain (8.3): perosotan + ayunan + bak pasir. */
export function makePropPlayground(): THREE.Group {
  const g = new THREE.Group();
  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 1.2), std(0xf59e0b));
  platform.position.set(-2.2, 0.8, -1);
  platform.castShadow = true;
  g.add(platform);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 2.8), std(0x38bdf8, 0.6));
  chute.position.set(-2.2, 0.75, 0.8);
  chute.rotation.x = 0.55;
  g.add(chute);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), std(0x3b4756, 0.6));
  bar.position.set(1.6, 2.2, 0.5);
  g.add(bar);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.12), std(0x3b4756, 0.6));
  legL.position.set(0.5, 1.1, 0.5);
  legL.rotation.z = 0.28;
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.12), std(0x3b4756, 0.6));
  legR.position.set(2.7, 1.1, 0.5);
  legR.rotation.z = -0.28;
  g.add(legR);
  g.add(
    instanced(new THREE.BoxGeometry(0.5, 0.08, 0.3), std(0x8a5a3b), [
      composeMatrix(1, 0.85, 0.5),
      composeMatrix(2.2, 0.85, 0.5),
    ]),
  );
  g.add(
    instanced(new THREE.BoxGeometry(0.04, 1.3, 0.04), std(0x64748b, 0.6), [
      composeMatrix(0.85, 1.55, 0.5),
      composeMatrix(1.15, 1.55, 0.5),
      composeMatrix(2.05, 1.55, 0.5),
      composeMatrix(2.35, 1.55, 0.5),
    ]),
  );
  const sand = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 2.2), std(0xe7d3a1, 1));
  sand.position.set(-0.4, 0.12, 2.1);
  sand.receiveShadow = true;
  g.add(sand);
  return g;
}

/** Lapak pasar (8.3): 3 kios warna-warni — 4 InstancedMesh. */
export function makePropMarket(): THREE.Group {
  const g = new THREE.Group();
  const stallXs = [-1.8, 0, 1.8];
  const roofColors = [0xef4444, 0xf59e0b, 0x22c55e];
  const crateColors = [0xf97316, 0x84cc16, 0xec4899];
  g.add(
    instanced(new THREE.BoxGeometry(1.6, 0.9, 1.1), std(0x8a5a3b), stallXs.map((x) => composeMatrix(x, 0.45, 0)), true),
  );
  const roofs = instanced(
    new THREE.BoxGeometry(2, 0.12, 1.5),
    std(0xffffff),
    stallXs.map((x) => composeMatrix(x, 2.05, 0)),
    true,
  );
  roofColors.forEach((c, i) => roofs.setColorAt(i, new THREE.Color(c)));
  if (roofs.instanceColor) roofs.instanceColor.needsUpdate = true;
  g.add(roofs);
  const postMatrices: THREE.Matrix4[] = [];
  stallXs.forEach((x) => {
    postMatrices.push(composeMatrix(x - 0.85, 1.25, -0.55));
    postMatrices.push(composeMatrix(x + 0.85, 1.25, 0.55));
  });
  g.add(instanced(new THREE.BoxGeometry(0.08, 1.6, 0.08), std(0x5b3a26), postMatrices, true));
  const crates = instanced(
    new THREE.BoxGeometry(0.45, 0.35, 0.45),
    std(0xffffff),
    stallXs.map((x) => composeMatrix(x + 0.35, 1.05, 0)),
  );
  crateColors.forEach((c, i) => crates.setColorAt(i, new THREE.Color(c)));
  if (crates.instanceColor) crates.instanceColor.needsUpdate = true;
  g.add(crates);
  return g;
}

/** Halte bus (8.3): atap + tiang + bangku tunggu. */
export function makePropBusStop(): THREE.Group {
  const g = new THREE.Group();
  // Phase 9: atap pelana hijau daun (dulu pelat datar 0x334155).
  const roof = gableRoofMesh(3.4, 2.0, 0.9, WARM_ROOF_COLORS.leaf);
  roof.position.y = 2.4 + 0.9 / 3;
  g.add(roof);
  g.add(
    instanced(new THREE.BoxGeometry(0.1, 2.4, 0.1), std(0x3b4756, 0.6), [
      composeMatrix(-1.3, 1.2, 0),
      composeMatrix(1.3, 1.2, 0),
    ], true),
  );
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.45), std(0x8a5a3b));
  seat.position.set(0, 0.45, 0.3);
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.08), std(0x8a5a3b));
  back.position.set(0, 0.75, 0.55);
  g.add(back);
  return g;
}

/** Kolam (8.3): tepi + air biru — lebih kecil dari kolam tetap 8.2. */
export function makePropPool(): THREE.Group {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.4, 4.4), std(0xe2e8f0, 0.95));
  rim.position.y = 0.2;
  rim.receiveShadow = true;
  g.add(rim);
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.12, 4),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, roughness: 0.1 }),
  );
  water.position.y = 0.34;
  g.add(water);
  return g;
}

/** Mobil parkir (8.3): badan + kabin + 4 roda (satu InstancedMesh). */
export function makePropCar(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.1), std(0x2563eb, 0.5));
  body.position.y = 0.42;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.0), std(0x1e293b, 0.4));
  cabin.position.set(-0.1, 0.9, 0);
  cabin.castShadow = true;
  g.add(cabin);
  const wheels: THREE.Matrix4[] = [];
  for (const dx of [-0.75, 0.75]) {
    for (const dz of [-0.55, 0.55]) {
      wheels.push(composeMatrix(dx, 0.28, dz, Math.PI / 2, 0, 0));
    }
  }
  g.add(instanced(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12), std(0x1e293b, 0.9), wheels));
  return g;
}

/** Taman bunga (8.3): bedeng + 8 bunga warna-warni (InstancedMesh). */
export function makePropFlowerbed(): THREE.Group {
  const g = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 2.5), std(0x8a5a3b));
  bed.position.y = 0.15;
  bed.castShadow = true;
  bed.receiveShadow = true;
  g.add(bed);
  const spots: [number, number][] = [
    [-0.8, -0.8], [0, -0.8], [0.8, -0.8],
    [-0.8, 0], [0.8, 0],
    [-0.8, 0.8], [0, 0.8], [0.8, 0.8],
  ];
  const flowerColors = [0xef4444, 0xf59e0b, 0xec4899, 0xa855f7, 0x22c55e, 0x3b82f6, 0xf97316, 0xeab308];
  const heads = instanced(
    new THREE.SphereGeometry(0.14, 10, 8),
    std(0xffffff),
    spots.map(([x, z]) => composeMatrix(x, 0.62, z)),
  );
  flowerColors.forEach((c, i) => heads.setColorAt(i, new THREE.Color(c)));
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  g.add(heads);
  g.add(
    instanced(
      new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6),
      std(0x16a34a, 1),
      spots.map(([x, z]) => composeMatrix(x, 0.42, z)),
    ),
  );
  return g;
}

/** Meja kafe (8.3): meja bundar + dua kursi. */
export function makePropCafeTable(): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 20), std(0xa16207));
  top.position.y = 0.75;
  top.castShadow = true;
  g.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.75, 10), std(0x3b4756, 0.6));
  leg.position.y = 0.37;
  g.add(leg);
  g.add(
    instanced(new THREE.BoxGeometry(0.45, 0.07, 0.45), std(0x8a5a3b), [
      composeMatrix(-1.2, 0.45, 0),
      composeMatrix(1.2, 0.45, 0),
    ]),
  );
  g.add(
    instanced(new THREE.BoxGeometry(0.45, 0.55, 0.07), std(0x8a5a3b), [
      composeMatrix(-1.2, 0.7, -0.22),
      composeMatrix(1.2, 0.7, 0.22),
    ]),
  );
  return g;
}

/** Bangun satu objek builder pada posisi + rotasi tertentu. */
export function buildWorldObject(kind: WorldObjectKind, x: number, z: number, rotY: number): THREE.Group {
  let group: THREE.Group;
  if (kind === 'tree') group = makePropTree();
  else if (kind === 'bench') group = makePropBench();
  else if (kind === 'lamp') group = makePropLamp();
  else if (kind === 'fountain') group = makePropFountain();
  else if (kind === 'glassTower') group = makePropGlassTower();
  else if (kind === 'office') group = makePropOffice();
  else if (kind === 'shop') group = makePropShop();
  else if (kind === 'house') group = makePropHouse();
  else if (kind === 'school') group = makePropSchool();
  else if (kind === 'clinic') group = makePropClinic();
  else if (kind === 'mosque') group = makePropMosque();
  else if (kind === 'playground') group = makePropPlayground();
  else if (kind === 'market') group = makePropMarket();
  else if (kind === 'busstop') group = makePropBusStop();
  else if (kind === 'pool') group = makePropPool();
  else if (kind === 'car') group = makePropCar();
  else if (kind === 'flowerbed') group = makePropFlowerbed();
  else if (kind === 'cafeTable') group = makePropCafeTable();
  // Hewan (kucing/anjing/bebek) TIDAK dibangun di sini — dirender oleh
  // BuilderAnimals (InstancedMesh per bagian tubuh, berkeliaran).
  // Grup kosong supaya setWorldObjects tetap aman bila dipanggil langsung.
  else group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  return group;
}
