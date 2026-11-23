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
//
// Definisi bagian tubuh + helper gerak tinggal di animalParts.ts (dipakai
// bersama BuilderAnimals 8.3); kelas ini hanya mengatur area jelajah
// tetap 8.2 + siklus hidup InstancedMesh-nya.

import * as THREE from 'three';
import {
  ANIMAL_SPEEDS,
  buildAnimalPartDefs,
  randomInCircle,
  randomInRect,
  turnToward,
  type AnimalKind,
  type PartDef,
} from './animalParts';

export type { AnimalKind };

export const ANIMAL_COUNTS: Record<AnimalKind, number> = { cat: 2, dog: 2, duck: 3 };

/** Area jelajah: kucing/anjing = lingkaran, bebek = persegi di kolam. */
export const ANIMAL_ROAM = {
  cat: { cx: -20, cz: 10, r: 5 },
  dog: { cx: 14, cz: 8, r: 4 },
  duck: { x0: 25, x1: 33, z0: 18, z1: 22 },
} as const;

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
    const defs = buildAnimalPartDefs(ANIMAL_COUNTS);
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
      const step = ANIMAL_SPEEDS[a.kind] * dt;
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
