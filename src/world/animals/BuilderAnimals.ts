// Hewan dari panel Builder — Phase 8.3. Sama seperti hewan ambient 8.2
// (BUKAN agent: tidak ada di sidebar, tidak bisa di-chat, tidak memegang
// tugas), tapi titik rumahnya ditentukan Bos saat menempatkan:
// kucing/anjing berkeliaran pelan dalam lingkaran di sekitar titik
// penempatannya, bebek berenang di kolam 8.2 (validasi penempatan sudah
// menjamin bebek hanya bisa ditempatkan di dalam kolam).
//
// Daftar hewan bersifat dinamis (tambah/pindah/hapus lewat panel), jadi
// InstancedMesh dibangun ulang tiap setAnimals. Tiap spesies tetap satu
// InstancedMesh per bagian tubuh (pelajaran 7.1) — bukan satu Mesh per
// hewan.

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
import { ANIMAL_ROAM } from './Animals';

/** Jari-jari jelajah kucing/anjing Builder di sekitar titik penempatan. */
export const BUILDER_ROAM_RADIUS = 4.5;

export interface BuilderAnimalItem {
  kind: AnimalKind;
  /** Titik penempatan (pusat lingkaran jelajah kucing/anjing). */
  x: number;
  z: number;
}

interface BuilderAnimalState {
  kind: AnimalKind;
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
  yaw: number;
  targetX: number;
  targetZ: number;
  pauseUntil: number;
  phase: number;
}

interface PartMesh {
  mesh: THREE.InstancedMesh;
  defs: PartDef[][];
}

export class BuilderAnimals {
  readonly group = new THREE.Group();
  private animals: BuilderAnimalState[] = [];
  private parts: PartMesh[] = [];
  private partCounts = {} as Record<AnimalKind, number>;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  /** Ganti seluruh daftar hewan Builder (dipanggil tiap objek berubah). */
  setAnimals(items: BuilderAnimalItem[]): void {
    // Buang mesh lama (termasuk geometri/materialnya) sebelum membangun baru.
    for (const part of this.parts) {
      this.group.remove(part.mesh);
      part.mesh.geometry.dispose();
      const mat = part.mesh.material as THREE.Material;
      mat.dispose();
    }
    this.parts = [];
    this.partCounts = { cat: 0, dog: 0, duck: 0 };
    this.animals = items.map((item) => {
      const [x, z] = this.randomTarget(item.kind, item.x, item.z);
      return {
        kind: item.kind,
        homeX: item.x,
        homeZ: item.z,
        x,
        z,
        yaw: Math.random() * Math.PI * 2,
        targetX: x,
        targetZ: z,
        pauseUntil: Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
      };
    });
    const counts: Record<AnimalKind, number> = { cat: 0, dog: 0, duck: 0 };
    for (const a of this.animals) counts[a.kind] += 1;
    const defs = buildAnimalPartDefs(counts);
    const kinds = Object.keys(counts) as AnimalKind[];
    for (const kind of kinds) {
      if (counts[kind] === 0) continue;
      const partList = defs[kind];
      this.partCounts[kind] = partList.length;
      for (const part of partList) {
        const count = part.defs.flat().length;
        const mesh = new THREE.InstancedMesh(part.geo, part.mat, count);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = true;
        // Bounding sphere mencakup semua titik rumah spesies ini + radius
        // jelajah, supaya frustum culling tetap benar meski hewan bergerak.
        mesh.boundingSphere = this.boundingSphereFor(kind);
        this.parts.push({ mesh, defs: part.defs });
        this.group.add(mesh);
      }
    }
    this.writeAll(0);
  }

  private boundingSphereFor(kind: AnimalKind): THREE.Sphere {
    if (kind === 'duck') {
      return new THREE.Sphere(new THREE.Vector3(29, 0.5, 20), 6);
    }
    const homes = this.animals.filter((a) => a.kind === kind);
    if (homes.length === 0) return new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 1);
    const cx = homes.reduce((s, a) => s + a.homeX, 0) / homes.length;
    const cz = homes.reduce((s, a) => s + a.homeZ, 0) / homes.length;
    const r =
      Math.max(...homes.map((a) => Math.hypot(a.homeX - cx, a.homeZ - cz))) + BUILDER_ROAM_RADIUS + 2;
    return new THREE.Sphere(new THREE.Vector3(cx, 0.5, cz), r);
  }

  private randomTarget(kind: AnimalKind, homeX: number, homeZ: number): [number, number] {
    if (kind === 'duck') return randomInRect(ANIMAL_ROAM.duck.x0, ANIMAL_ROAM.duck.x1, ANIMAL_ROAM.duck.z0, ANIMAL_ROAM.duck.z1);
    return randomInCircle(homeX, homeZ, BUILDER_ROAM_RADIUS);
  }

  /** Posisi terkini semua hewan Builder (untuk uji + debug). */
  getPositions(): { kind: AnimalKind; x: number; z: number; homeX: number; homeZ: number }[] {
    return this.animals.map((a) => ({ kind: a.kind, x: a.x, z: a.z, homeX: a.homeX, homeZ: a.homeZ }));
  }

  getCount(): number {
    return this.animals.length;
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
        const [nx, nz] = this.randomTarget(a.kind, a.homeX, a.homeZ);
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
    const kinds = Object.keys(this.partCounts) as AnimalKind[];
    const byKind = new Map<AnimalKind, BuilderAnimalState[]>();
    for (const a of this.animals) {
      const list = byKind.get(a.kind) ?? [];
      list.push(a);
      byKind.set(a.kind, list);
    }
    let partIdx = 0;
    for (const kind of kinds) {
      const list = byKind.get(kind) ?? [];
      if (list.length === 0) continue;
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
