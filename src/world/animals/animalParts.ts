// Definisi hewan bersama — dipakai Animals (ambient 8.2) dan
// BuilderAnimals (hewan dari panel Builder, 8.3). Satu InstancedMesh
// per bagian tubuh per spesies (pelajaran 7.1): bagian yang sama di
// semua hewan satu spesies digambar sekali.
//
// Gerak prosedural: pilih target acak dalam area jelajah, berjalan
// pelan ke sana, berhenti 2–6 dtk, ulangi. Posisi selalu di dalam area
// — dijamin konstruksi (target dipilih di dalam area), bukan harapan.

import * as THREE from 'three';

export type AnimalKind = 'cat' | 'dog' | 'duck';

/** Kecepatan jalan tiap spesies (unit/detik). */
export const ANIMAL_SPEEDS: Record<AnimalKind, number> = { cat: 0.7, dog: 0.9, duck: 0.4 };

export interface PartDef {
  /** Offset lokal dari pusat hewan (maju = +z lokal). */
  offset: [number, number, number];
  /** Rotasi lokal (Euler XYZ, radian). */
  rot: [number, number, number];
  /** Skala lokal. */
  scale: [number, number, number];
}

export interface AnimalPart {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  /** Definisi bagian per hewan (index = index hewan dalam spesies). */
  defs: PartDef[][];
}

export function turnToward(yaw: number, target: number, maxStep: number): number {
  let diff = target - yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return yaw + Math.sign(diff) * maxStep;
}

export function randomInCircle(cx: number, cz: number, r: number): [number, number] {
  const a = Math.random() * Math.PI * 2;
  const d = Math.sqrt(Math.random()) * r;
  return [cx + Math.cos(a) * d, cz + Math.sin(a) * d];
}

export function randomInRect(x0: number, x1: number, z0: number, z1: number): [number, number] {
  return [x0 + Math.random() * (x1 - x0), z0 + Math.random() * (z1 - z0)];
}

/** Geometri + bagian tubuh per spesies untuk `counts` hewan tiap spesies. */
export function buildAnimalPartDefs(counts: Record<AnimalKind, number>): Record<AnimalKind, AnimalPart[]> {
  const std = (color: number): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
  const catMat = std(0xd97706);
  const dogMat = std(0x8a5a3b);
  const duckMat = std(0xf8fafc);
  const beakMat = std(0xf59e0b);
  const repeat = (n: number, def: PartDef): PartDef[][] => Array.from({ length: n }, () => [def]);
  const ears = (n: number, y: number, z: number, dx: number): PartDef[][] =>
    Array.from({ length: n }, () => [
      { offset: [-dx, y, z], rot: [0, 0, 0], scale: [1, 1, 1] },
      { offset: [dx, y, z], rot: [0, 0, 0], scale: [1, 1, 1] },
    ]);
  return {
    cat: [
      { geo: new THREE.BoxGeometry(0.5, 0.25, 0.28), mat: catMat, defs: repeat(counts.cat, { offset: [0, 0.22, 0], rot: [0, 0, 0], scale: [1, 1, 1] }) },
      { geo: new THREE.SphereGeometry(0.15, 12, 10), mat: catMat, defs: repeat(counts.cat, { offset: [0, 0.38, 0.18], rot: [0, 0, 0], scale: [1, 1, 1] }) },
      { geo: new THREE.ConeGeometry(0.06, 0.12, 6), mat: catMat, defs: ears(counts.cat, 0.52, 0.18, 0.08) },
      { geo: new THREE.BoxGeometry(0.06, 0.06, 0.35), mat: catMat, defs: repeat(counts.cat, { offset: [0, 0.3, -0.3], rot: [-0.5, 0, 0], scale: [1, 1, 1] }) },
    ],
    dog: [
      { geo: new THREE.BoxGeometry(0.7, 0.3, 0.32), mat: dogMat, defs: repeat(counts.dog, { offset: [0, 0.25, 0], rot: [0, 0, 0], scale: [1, 1, 1] }) },
      { geo: new THREE.BoxGeometry(0.22, 0.22, 0.24), mat: dogMat, defs: repeat(counts.dog, { offset: [0, 0.42, 0.32], rot: [0, 0, 0], scale: [1, 1, 1] }) },
      { geo: new THREE.BoxGeometry(0.08, 0.16, 0.04), mat: dogMat, defs: ears(counts.dog, 0.5, 0.3, 0.09) },
      { geo: new THREE.BoxGeometry(0.05, 0.05, 0.3), mat: dogMat, defs: repeat(counts.dog, { offset: [0, 0.35, -0.38], rot: [-0.6, 0, 0], scale: [1, 1, 1] }) },
    ],
    duck: [
      { geo: new THREE.SphereGeometry(0.22, 12, 10), mat: duckMat, defs: repeat(counts.duck, { offset: [0, 0.42, 0], rot: [0, 0, 0], scale: [1, 0.75, 1.3] }) },
      { geo: new THREE.SphereGeometry(0.11, 12, 10), mat: duckMat, defs: repeat(counts.duck, { offset: [0, 0.6, 0.22], rot: [0, 0, 0], scale: [1, 1, 1] }) },
      { geo: new THREE.ConeGeometry(0.05, 0.12, 8), mat: beakMat, defs: repeat(counts.duck, { offset: [0, 0.58, 0.36], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1] }) },
    ],
  };
}
