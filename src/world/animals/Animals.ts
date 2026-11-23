// Hewan ambient — Phase 8.2. Dekorasi yang berkeliaran, BUKAN agent:
// tidak ada di sidebar, tidak bisa di-chat, tidak memegang tugas, tidak
// memengaruhi status/HUD. Kucing + anjing berkeliaran pelan dalam
// lingkaran jelajah; bebek berenang pelan di kolam (bobbing di air).
// Tiap spesies dirakit dari InstancedMesh per bagian tubuh (pelajaran
// 7.1): 2 kucing + 2 anjing + 3 bebek = 11 draw call, tanpa bayangan
// (hewan kecil; bayangannya tidak terlihat dari Overview).
//
// Gerak prosedural: pilih target acak dalam area jelajah, berjalan pelan
// ke sana, berhenti 2–6 dtk, ulangi. Posisi selalu di dalam area —
// dijamin konstruksi (target dipilih di dalam area), bukan harapan.

import * as THREE from 'three';

export type AnimalKind = 'cat' | 'dog' | 'duck';

export const ANIMAL_COUNTS: Record<AnimalKind, number> = { cat: 2, dog: 2, duck: 3 };

/** Area jelajah: kucing/anjing = lingkaran, bebek = persegi di kolam. */
export const ANIMAL_ROAM = {
  cat: { cx: -20, cz: 10, r: 5 },
  dog: { cx: 14, cz: 8, r: 4 },
  duck: { x0: 25, x1: 33, z0: 18, z1: 22 },
} as const;

const SPEEDS: Record<AnimalKind, number> = { cat: 0.7, dog: 0.9, duck: 0.4 };

interface AnimalState {
  kind: AnimalKind;
  x: number;
  z: number;
  yaw: number;
  targetX: number;
  targetZ: number;
  pauseUntil: number;
  phase: number;
}

interface PartDef {
  /** Offset lokal dari pusat hewan (maju = +z lokal). */
  offset: [number, number, number];
  /** Rotasi lokal (Euler XYZ, radian). */
  rot: [number, number, number];
  /** Skala lokal. */
  scale: [number, number, number];
}

function turnToward(yaw: number, target: number, maxStep: number): number {
  let diff = target - yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return yaw + Math.sign(diff) * maxStep;
}

function randomInCircle(cx: number, cz: number, r: number): [number, number] {
  const a = Math.random() * Math.PI * 2;
  const d = Math.sqrt(Math.random()) * r;
  return [cx + Math.cos(a) * d, cz + Math.sin(a) * d];
}

function randomInRect(x0: number, x1: number, z0: number, z1: number): [number, number] {
  return [x0 + Math.random() * (x1 - x0), z0 + Math.random() * (z1 - z0)];
}

/** Satu InstancedMesh per bagian tubuh, dengan daftar definisi bagiannya. */
interface PartMesh {
  mesh: THREE.InstancedMesh;
  /** Definisi bagian per hewan (index = index hewan dalam spesies). */
  defs: PartDef[][];
}

export class Animals {
  readonly group = new THREE.Group();
  private readonly animals: AnimalState[] = [];
  private readonly parts: PartMesh[] = [];
  /** Jumlah PartMesh per spesies (kucing 4, anjing 4, bebek 3). */
  private readonly partCounts = {} as Record<AnimalKind, number>;

  constructor(scene: THREE.Scene) {
    const defs = this.buildDefs();
    for (const [kind, count] of Object.entries(ANIMAL_COUNTS) as [AnimalKind, number][]) {
      for (let i = 0; i < count; i++) {
        const [x, z] = this.randomTarget(kind);
        this.animals.push({
          kind,
          x,
          z,
          yaw: Math.random() * Math.PI * 2,
          targetX: x,
          targetZ: z,
          pauseUntil: Math.random() * 3,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    // Satu InstancedMesh per bagian tubuh per spesies.
    for (const [kind, partList] of Object.entries(defs) as [AnimalKind, { geo: THREE.BufferGeometry; mat: THREE.Material; defs: PartDef[][] }[]][]) {
      this.partCounts[kind] = partList.length;
      for (const part of partList) {
        const count = part.defs.flat().length;
        const mesh = new THREE.InstancedMesh(part.geo, part.mat, count);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = true;
        this.parts.push({ mesh, defs: part.defs });
        this.group.add(mesh);
      }
    }
    // Bounding sphere manual per spesies (mencakup seluruh area jelajah)
    // supaya frustum culling tetap benar meski instansi bergerak.
    const spheres: Record<AnimalKind, THREE.Sphere> = {
      cat: new THREE.Sphere(new THREE.Vector3(ANIMAL_ROAM.cat.cx, 0.5, ANIMAL_ROAM.cat.cz), ANIMAL_ROAM.cat.r + 2),
      dog: new THREE.Sphere(new THREE.Vector3(ANIMAL_ROAM.dog.cx, 0.5, ANIMAL_ROAM.dog.cz), ANIMAL_ROAM.dog.r + 2),
      duck: new THREE.Sphere(new THREE.Vector3(29, 0.5, 20), 6),
    };
    // Urutan parts mengikuti urutan spesies di ANIMAL_COUNTS (cat, dog, duck).
    const kinds = Object.keys(ANIMAL_COUNTS) as AnimalKind[];
    let partIdx = 0;
    for (const kind of kinds) {
      const nParts = defs[kind].length;
      for (let p = 0; p < nParts; p++) {
        this.parts[partIdx].mesh.boundingSphere = spheres[kind].clone();
        partIdx++;
      }
    }
    scene.add(this.group);
    this.writeAll(0);
  }

  /** Definisi geometri + bagian tubuh per spesies. */
  private buildDefs(): Record<AnimalKind, { geo: THREE.BufferGeometry; mat: THREE.Material; defs: PartDef[][] }[]> {
    const std = (color: number): THREE.MeshStandardMaterial =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
    const catMat = std(0xd97706);
    const dogMat = std(0x8a5a3b);
    const duckMat = std(0xf8fafc);
    const beakMat = std(0xf59e0b);
    const catCount = ANIMAL_COUNTS.cat;
    const dogCount = ANIMAL_COUNTS.dog;
    const duckCount = ANIMAL_COUNTS.duck;
    const repeat = (n: number, def: PartDef): PartDef[][] => Array.from({ length: n }, () => [def]);
    const ears = (n: number, y: number, z: number, dx: number): PartDef[][] =>
      Array.from({ length: n }, () => [
        { offset: [-dx, y, z], rot: [0, 0, 0], scale: [1, 1, 1] },
        { offset: [dx, y, z], rot: [0, 0, 0], scale: [1, 1, 1] },
      ]);
    return {
      cat: [
        { geo: new THREE.BoxGeometry(0.5, 0.25, 0.28), mat: catMat, defs: repeat(catCount, { offset: [0, 0.22, 0], rot: [0, 0, 0], scale: [1, 1, 1] }) },
        { geo: new THREE.SphereGeometry(0.15, 12, 10), mat: catMat, defs: repeat(catCount, { offset: [0, 0.38, 0.18], rot: [0, 0, 0], scale: [1, 1, 1] }) },
        { geo: new THREE.ConeGeometry(0.06, 0.12, 6), mat: catMat, defs: ears(catCount, 0.52, 0.18, 0.08) },
        { geo: new THREE.BoxGeometry(0.06, 0.06, 0.35), mat: catMat, defs: repeat(catCount, { offset: [0, 0.3, -0.3], rot: [-0.5, 0, 0], scale: [1, 1, 1] }) },
      ],
      dog: [
        { geo: new THREE.BoxGeometry(0.7, 0.3, 0.32), mat: dogMat, defs: repeat(dogCount, { offset: [0, 0.25, 0], rot: [0, 0, 0], scale: [1, 1, 1] }) },
        { geo: new THREE.BoxGeometry(0.22, 0.22, 0.24), mat: dogMat, defs: repeat(dogCount, { offset: [0, 0.42, 0.32], rot: [0, 0, 0], scale: [1, 1, 1] }) },
        { geo: new THREE.BoxGeometry(0.08, 0.16, 0.04), mat: dogMat, defs: ears(dogCount, 0.5, 0.3, 0.09) },
        { geo: new THREE.BoxGeometry(0.05, 0.05, 0.3), mat: dogMat, defs: repeat(dogCount, { offset: [0, 0.35, -0.38], rot: [-0.6, 0, 0], scale: [1, 1, 1] }) },
      ],
      duck: [
        { geo: new THREE.SphereGeometry(0.22, 12, 10), mat: duckMat, defs: repeat(duckCount, { offset: [0, 0.42, 0], rot: [0, 0, 0], scale: [1, 0.75, 1.3] }) },
        { geo: new THREE.SphereGeometry(0.11, 12, 10), mat: duckMat, defs: repeat(duckCount, { offset: [0, 0.6, 0.22], rot: [0, 0, 0], scale: [1, 1, 1] }) },
        { geo: new THREE.ConeGeometry(0.05, 0.12, 8), mat: beakMat, defs: repeat(duckCount, { offset: [0, 0.58, 0.36], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1] }) },
      ],
    };
  }

  private randomTarget(kind: AnimalKind): [number, number] {
    if (kind === 'cat') return randomInCircle(ANIMAL_ROAM.cat.cx, ANIMAL_ROAM.cat.cz, ANIMAL_ROAM.cat.r);
    if (kind === 'dog') return randomInCircle(ANIMAL_ROAM.dog.cx, ANIMAL_ROAM.dog.cz, ANIMAL_ROAM.dog.r);
    return randomInRect(ANIMAL_ROAM.duck.x0, ANIMAL_ROAM.duck.x1, ANIMAL_ROAM.duck.z0, ANIMAL_ROAM.duck.z1);
  }

  /** Posisi terkini semua hewan (untuk uji + debug). */
  getPositions(): { kind: AnimalKind; x: number; z: number }[] {
    return this.animals.map((a) => ({ kind: a.kind, x: a.x, z: a.z }));
  }

  update(dt: number, t: number): void {
    for (const a of this.animals) {
      if (t < a.pauseUntil) continue;
      const dx = a.targetX - a.x;
      const dz = a.targetZ - a.z;
      const dist = Math.hypot(dx, dz);
      const step = SPEEDS[a.kind] * dt;
      a.yaw = turnToward(a.yaw, Math.atan2(dx, dz), 3 * dt);
      if (dist <= step) {
        a.x = a.targetX;
        a.z = a.targetZ;
        a.pauseUntil = t + 2 + Math.random() * 4;
        const [nx, nz] = this.randomTarget(a.kind);
        a.targetX = nx;
        a.targetZ = nz;
      } else {
        a.x += (dx / dist) * step;
        a.z += (dz / dist) * step;
      }
    }
    this.writeAll(t);
  }

  private writeAll(t: number): void {
    const base = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    // parts berurutan per spesies: kucing (4), anjing (4), bebek (3).
    const kinds = Object.keys(ANIMAL_COUNTS) as AnimalKind[];
    const byKind = new Map<AnimalKind, AnimalState[]>();
    for (const a of this.animals) {
      const list = byKind.get(a.kind) ?? [];
      list.push(a);
      byKind.set(a.kind, list);
    }
    // parts berurutan per spesies (kucing, anjing, bebek) dengan jumlah
    // yang tercatat di partCounts saat konstruksi.
    let partIdx = 0;
    for (const kind of kinds) {
      const list = byKind.get(kind) ?? [];
      const nParts = this.partCounts[kind];
      for (let p = 0; p < nParts; p++) {
        const part = this.parts[partIdx + p];
        let inst = 0;
        list.forEach((a, ai) => {
          const y = a.kind === 'duck' ? 0.34 + Math.sin(t * 2 + a.phase) * 0.03 : 0;
          base.makeRotationY(a.yaw);
          base.setPosition(a.x, y, a.z);
          for (const def of part.defs[ai]) {
            e.set(def.rot[0], def.rot[1], def.rot[2]);
            q.setFromEuler(e);
            pos.set(def.offset[0], def.offset[1], def.offset[2]);
            scl.set(def.scale[0], def.scale[1], def.scale[2]);
            local.compose(pos, q, scl);
            const m = new THREE.Matrix4().multiplyMatrices(base, local);
            part.mesh.setMatrixAt(inst, m);
            inst++;
          }
        });
        part.mesh.instanceMatrix.needsUpdate = true;
      }
      partIdx += nParts;
    }
  }
}
