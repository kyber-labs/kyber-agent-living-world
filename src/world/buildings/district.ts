// Kawasan baru Phase 8.2 — masjid, sekolah, klinik, toko, lapak pasar,
// menara kaca, kolam renang, taman bermain, halte bus, mobil parkir.
// Semua primitif low-poly gaya kota Phase 2 (bukan file model eksternal).
// Elemen berulang (kios pasar, mobil, ayunan) memakai InstancedMesh
// (pelajaran 7.1) supaya draw call tidak meledak.
//
// Koordinat (dipilih di lahan kosong, di dalam batas ±45 — lihat
// docs/PHASES.md §8.2 untuk peta + bukti tidak menabrak):
//   masjid (-36,33) · sekolah (-24,-34) · klinik (20,-34) · toko (8,34)
//   lapak pasar (-14,36) · menara kaca (36,-34) · kolam (29,20)
//   taman bermain (20,35) · halte (20,4.5) · mobil (12/26/-12, 4.5)

import * as THREE from 'three';
import type { BuildingFootprint } from './city';
import { buildInstanced, composeMatrix, gableRoofMesh, glassMaterial, WARM_ROOF_COLORS } from './city';

export const NEW_BUILDINGS: BuildingFootprint[] = [
  { id: 'mosque', name: 'Masjid', kind: 'mosque', x: -36, z: 33, w: 8, d: 8, color: '#15803d' },
  { id: 'school', name: 'Sekolah', kind: 'school', x: -24, z: -34, w: 12, d: 8, color: '#f59e0b' },
  { id: 'clinic', name: 'Klinik', kind: 'clinic', x: 20, z: -34, w: 10, d: 7, color: '#ef4444' },
  { id: 'shop', name: 'Toko', kind: 'shop', x: 8, z: 34, w: 8, d: 6, color: '#8b5cf6' },
  { id: 'market', name: 'Lapak Pasar', kind: 'market', x: -14, z: 36, w: 13, d: 3, color: '#f97316' },
  { id: 'tower', name: 'Menara Kaca', kind: 'tower', x: 36, z: -34, w: 8, d: 8, color: '#38bdf8' },
  { id: 'pool', name: 'Kolam Renang', kind: 'pool', x: 29, z: 20, w: 10, d: 6, color: '#0ea5e9' },
  { id: 'playground', name: 'Taman Bermain', kind: 'playground', x: 20, z: 35, w: 8, d: 7, color: '#ec4899' },
  { id: 'busstop', name: 'Halte Bus', kind: 'busstop', x: 20, z: 4.5, w: 3, d: 1.5, color: '#64748b' },
  { id: 'car-1', name: 'Mobil Parkir', kind: 'car', x: 12, z: 4.5, w: 2.4, d: 1.3, color: '#dc2626' },
  { id: 'car-2', name: 'Mobil Parkir', kind: 'car', x: 26, z: 4.5, w: 2.4, d: 1.3, color: '#2563eb' },
  { id: 'car-3', name: 'Mobil Parkir', kind: 'car', x: -12, z: 4.5, w: 2.4, d: 1.3, color: '#eab308' },
];

function std(color: number, roughness = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  castShadow = true,
  receiveShadow = true,
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  return m;
}

/** Masjid: badan krem + kubah hijau + menara (6 mesh). */
function buildMosque(parent: THREE.Group): void {
  const g = new THREE.Group();
  g.position.set(-36, 0, 33);
  g.add(mesh(new THREE.BoxGeometry(7, 4, 5.5), std(0xf5f0e6), 0, 2, 0));
  g.add(mesh(new THREE.SphereGeometry(2.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x16a34a, 0.7), 0, 4, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), std(0xf59e0b, 0.5), 0, 6.4, 0, false, false));
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.4, 9, 12), std(0xf5f0e6), -3.2, 4.5, -2.2));
  g.add(mesh(new THREE.ConeGeometry(0.55, 1.3, 12), std(0x16a34a, 0.7), -3.2, 9.6, -2.2));
  const door = mesh(new THREE.PlaneGeometry(1.4, 2.4), std(0x2b3a4a, 0.6), 0, 1.2, 2.78, false, false);
  g.add(door);
  parent.add(g);
}

/** Sekolah: badan kuning + atap + pintu + tiang bendera (5 mesh). */
function buildSchool(parent: THREE.Group): void {
  const g = new THREE.Group();
  g.position.set(-24, 0, -34);
  g.add(mesh(new THREE.BoxGeometry(11, 4, 7), std(0xf2c14e), 0, 2, 0));
  // Phase 9: atap pelana merah bata (dulu pelat datar 0x8a4a3b).
  const schoolRoof = gableRoofMesh(12, 7.8, 2.4, WARM_ROOF_COLORS.brick);
  schoolRoof.position.y = 4 + 2.4 / 3;
  g.add(schoolRoof);
  g.add(mesh(new THREE.PlaneGeometry(1.6, 2.6), std(0x2b3a4a, 0.6), 0, 1.3, 3.52, false, false));
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 8), std(0x3b4756, 0.6), 4.5, 2, 3.2));
  const flag = mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide, roughness: 0.8 }), 4.98, 3.7, 3.2, false, false);
  flag.rotation.y = Math.PI / 2;
  g.add(flag);
  parent.add(g);
}

/** Klinik: badan putih + atap + salib merah di dinding depan (5 mesh). */
function buildClinic(parent: THREE.Group): void {
  const g = new THREE.Group();
  g.position.set(20, 0, -34);
  g.add(mesh(new THREE.BoxGeometry(9, 3.5, 6), std(0xf8fafc), 0, 1.75, 0));
  // Phase 9: atap pelana hijau toska (dulu pelat datar 0x64748b).
  const clinicRoof = gableRoofMesh(10, 6.6, 2.0, WARM_ROOF_COLORS.teal);
  clinicRoof.position.y = 3.5 + 2.0 / 3;
  g.add(clinicRoof);
  const crossMat = std(0xef4444, 0.6);
  g.add(mesh(new THREE.BoxGeometry(0.35, 1.0, 0.15), crossMat, 0, 2.85, 3.05, false, false));
  g.add(mesh(new THREE.BoxGeometry(1.0, 0.35, 0.15), crossMat, 0, 2.85, 3.05, false, false));
  g.add(mesh(new THREE.PlaneGeometry(1.4, 2.2), std(0x2b3a4a, 0.6), 0, 1.1, 3.05, false, false));
  parent.add(g);
}

/** Toko: badan ungu + awning merah muda + papan nama + pintu (4 mesh). */
function buildShop(parent: THREE.Group): void {
  const g = new THREE.Group();
  g.position.set(8, 0, 34);
  g.add(mesh(new THREE.BoxGeometry(7, 3.5, 5), std(0x8b5cf6), 0, 1.75, 0));
  const awning = mesh(new THREE.BoxGeometry(7.4, 0.15, 1.8), std(0xec4899), 0, 2.7, 2.8);
  awning.rotation.x = -0.25;
  g.add(awning);
  g.add(mesh(new THREE.PlaneGeometry(2.6, 0.6), std(0xf8fafc, 0.7), 0, 3.15, 2.53, false, false));
  g.add(mesh(new THREE.PlaneGeometry(1.4, 2.4), std(0x2b3a4a, 0.6), 0, 1.2, 2.53, false, false));
  parent.add(g);
}

/** Lapak pasar: 5 kios warna-warni — 4 InstancedMesh (meja, atap, tiang, peti). */
function buildMarket(parent: THREE.Group): void {
  const stallXs = [-19, -16.5, -14, -11.5, -9];
  const roofColors = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xa855f7];
  const crateColors = [0xf97316, 0x84cc16, 0xec4899, 0x06b6d4, 0xeab308];
  const z = 36;
  parent.add(
    buildInstanced(
      new THREE.BoxGeometry(1.8, 0.9, 1.2),
      std(0x8a5a3b),
      stallXs.map((x) => composeMatrix(x, 0.45, z, 0, 0, 0, 1, 1, 1)),
      true,
      true,
    ),
  );
  const roofs = buildInstanced(
    new THREE.BoxGeometry(2.2, 0.12, 1.6),
    std(0xffffff),
    stallXs.map((x) => composeMatrix(x, 2.1, z, 0, 0, 0, 1, 1, 1)),
    true,
    false,
  );
  roofColors.forEach((c, i) => roofs.setColorAt(i, new THREE.Color(c)));
  if (roofs.instanceColor) roofs.instanceColor.needsUpdate = true;
  parent.add(roofs);
  const postMatrices: THREE.Matrix4[] = [];
  stallXs.forEach((x) => {
    postMatrices.push(composeMatrix(x - 0.95, 1.27, z - 0.6, 0, 0, 0, 1, 1, 1));
    postMatrices.push(composeMatrix(x + 0.95, 1.27, z + 0.6, 0, 0, 0, 1, 1, 1));
  });
  parent.add(
    buildInstanced(new THREE.BoxGeometry(0.08, 1.65, 0.08), std(0x5b3a26), postMatrices, true, false),
  );
  const crates = buildInstanced(
    new THREE.BoxGeometry(0.5, 0.4, 0.5),
    std(0xffffff),
    stallXs.map((x) => composeMatrix(x + 0.4, 1.1, z, 0, 0, 0, 1, 1, 1)),
    false,
    false,
  );
  crateColors.forEach((c, i) => crates.setColorAt(i, new THREE.Color(c)));
  if (crates.instanceColor) crates.instanceColor.needsUpdate = true;
  parent.add(crates);
}

/** Menara kaca: badan transparan (tanpa bayangan — kaca tidak melempar
 *  bayangan padat) + pelat atap + antena (3 mesh). */
function buildTower(parent: THREE.Group): void {
  const g = new THREE.Group();
  g.position.set(36, 0, -34);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(7, 20, 7),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.55,
      roughness: 0.12,
      metalness: 0.25,
    }),
  );
  glass.position.y = 10;
  glass.receiveShadow = false;
  g.add(glass);
  // Phase 9: mahkota limas kaca (dulu pelat datar 0x334155).
  const crown = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.0, 4), glassMaterial());
  crown.rotation.y = Math.PI / 4;
  crown.position.y = 21;
  g.add(crown);
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 8), std(0x3b4756, 0.6), 0, 22, 0, false, false));
  parent.add(g);
}

/** Kolam renang: tepi + air biru transparan (2 mesh, tanpa bayangan). */
function buildPool(parent: THREE.Group): void {
  const g = new THREE.Group();
  g.position.set(29, 0, 20);
  const rim = mesh(new THREE.BoxGeometry(10.6, 0.4, 6.6), std(0xe2e8f0, 0.95), 0, 0.2, 0, false, true);
  g.add(rim);
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.12, 6),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, roughness: 0.1 }),
  );
  water.position.y = 0.34;
  g.add(water);
  parent.add(g);
}

/** Taman bermain: perosotan + ayunan + bak pasir (8 draw call). */
function buildPlayground(parent: THREE.Group): void {
  const g = new THREE.Group();
  g.position.set(20, 0, 35);
  g.add(mesh(new THREE.BoxGeometry(1.2, 1.6, 1.2), std(0xf59e0b), -2.5, 0.8, -1));
  const chute = mesh(new THREE.BoxGeometry(0.8, 0.12, 2.8), std(0x38bdf8, 0.6), -2.5, 0.75, 0.8);
  chute.rotation.x = 0.55;
  g.add(chute);
  g.add(mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), std(0x3b4756, 0.6), 2, 2.2, 0.5));
  const legL = mesh(new THREE.BoxGeometry(0.12, 2.3, 0.12), std(0x3b4756, 0.6), 0.9, 1.1, 0.5);
  legL.rotation.z = 0.28;
  g.add(legL);
  const legR = mesh(new THREE.BoxGeometry(0.12, 2.3, 0.12), std(0x3b4756, 0.6), 3.1, 1.1, 0.5);
  legR.rotation.z = -0.28;
  g.add(legR);
  // Matriks instansi LOKAL terhadap grup (grup sudah di (20,0,35)).
  g.add(
    buildInstanced(
      new THREE.BoxGeometry(0.5, 0.08, 0.3),
      std(0x8a5a3b),
      [composeMatrix(1.4, 0.85, 0.5, 0, 0, 0, 1, 1, 1), composeMatrix(2.6, 0.85, 0.5, 0, 0, 0, 1, 1, 1)],
      false,
      false,
    ),
  );
  g.add(
    buildInstanced(
      new THREE.BoxGeometry(0.04, 1.3, 0.04),
      std(0x64748b, 0.6),
      [
        composeMatrix(1.25, 1.55, 0.5, 0, 0, 0, 1, 1, 1),
        composeMatrix(1.55, 1.55, 0.5, 0, 0, 0, 1, 1, 1),
        composeMatrix(2.45, 1.55, 0.5, 0, 0, 0, 1, 1, 1),
        composeMatrix(2.75, 1.55, 0.5, 0, 0, 0, 1, 1, 1),
      ],
      false,
      false,
    ),
  );
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.25, 2.2), std(0xe7d3a1, 1), 0, 0.12, 2.2));
  parent.add(g);
}

/** Halte bus: atap + tiang + bangku (4 draw call). */
function buildBusStop(parent: THREE.Group): void {
  const g = new THREE.Group();
  g.position.set(20, 0, 4.5);
  // Phase 9: atap pelana hijau daun (dulu pelat datar 0x334155).
  const stopRoof = gableRoofMesh(3.4, 2.0, 0.9, WARM_ROOF_COLORS.leaf);
  stopRoof.position.y = 2.4 + 0.9 / 3;
  g.add(stopRoof);
  g.add(
    buildInstanced(
      new THREE.BoxGeometry(0.1, 2.4, 0.1),
      std(0x3b4756, 0.6),
      // Matriks instansi LOKAL terhadap grup (grup sudah di (20,0,4.5)).
      [composeMatrix(-1.3, 1.2, 0, 0, 0, 0, 1, 1, 1), composeMatrix(1.3, 1.2, 0, 0, 0, 0, 1, 1, 1)],
      true,
      false,
    ),
  );
  g.add(mesh(new THREE.BoxGeometry(2, 0.1, 0.45), std(0x8a5a3b), 0, 0.45, 0.3));
  g.add(mesh(new THREE.BoxGeometry(2, 0.5, 0.08), std(0x8a5a3b), 0, 0.75, 0.55));
  parent.add(g);
}

/** Mobil parkir: 3 mobil statis — 3 InstancedMesh (badan, kabin, roda). */
function buildCars(parent: THREE.Group): void {
  const carXs = [12, 26, -12];
  const z = 4.5;
  const bodyColors = [0xdc2626, 0x2563eb, 0xeab308];
  const bodies = buildInstanced(
    new THREE.BoxGeometry(2.2, 0.55, 1.1),
    std(0xffffff, 0.5),
    carXs.map((x) => composeMatrix(x, 0.42, z, 0, 0, 0, 1, 1, 1)),
    true,
    true,
  );
  bodyColors.forEach((c, i) => bodies.setColorAt(i, new THREE.Color(c)));
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  parent.add(bodies);
  parent.add(
    buildInstanced(
      new THREE.BoxGeometry(1.2, 0.5, 1.0),
      std(0x1e293b, 0.4),
      carXs.map((x) => composeMatrix(x - 0.1, 0.9, z, 0, 0, 0, 1, 1, 1)),
      true,
      false,
    ),
  );
  const wheelMatrices: THREE.Matrix4[] = [];
  carXs.forEach((x) => {
    for (const dx of [-0.75, 0.75]) {
      for (const dz of [-0.55, 0.55]) {
        wheelMatrices.push(composeMatrix(x + dx, 0.28, z + dz, Math.PI / 2, 0, 0, 1, 1, 1));
      }
    }
  });
  parent.add(
    buildInstanced(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12), std(0x1e293b, 0.9), wheelMatrices, false, false),
  );
}

/** Bangun seluruh kawasan baru ke dalam grup yang diberikan (biasanya
 *  grup kota Phase 2) dan kembalikan daftar footprint-nya untuk
 *  CityInfo (minimap + validasi builder). */
export function buildDistrict(parent: THREE.Group): BuildingFootprint[] {
  buildMosque(parent);
  buildSchool(parent);
  buildClinic(parent);
  buildShop(parent);
  buildMarket(parent);
  buildTower(parent);
  buildPool(parent);
  buildPlayground(parent);
  buildBusStop(parent);
  buildCars(parent);
  return NEW_BUILDINGS;
}
