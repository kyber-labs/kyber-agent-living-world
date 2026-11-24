// Uji logika murni Phase 8.2 — dunia lebih kaya. Dijalankan lewat bundle
// rolldown (lihat scripts/run-all-tests.sh; `node scripts/phase82-test.ts`
// langsung gagal karena import tanpa ekstensi gaya Vite — bukan cacat).
// Yang diuji: penempatan gedung baru (dalam batas, tidak menabrak gedung
// lama/jalan/rumah/pohon), graf navigasi baru (tetap terhubung, sisi
// tidak menembus gedung), hewan (tetap dalam area jelajah, InstancedMesh,
// tanpa bayangan), hitungan draw call baru (main + shadow + total,
// konsisten dengan metode 7.1), suasana senja (nilai target Sore).
// Bukan uji UI/browser; tampilan visual diverifikasi live oleh parent.
import * as THREE from 'three';
import { buildCity, type BuildingFootprint } from '../src/world/buildings/city.ts';
import { NEW_BUILDINGS } from '../src/world/buildings/district.ts';
import { Animals, ANIMAL_COUNTS, ANIMAL_ROAM } from '../src/world/animals/Animals.ts';
import { NAV_NODES, findPath, getNode } from '../src/world/navigation/navGraph.ts';
import { environmentTargets } from '../src/simulation/environment.ts';
import {
  buildReplicaScene,
  countMain,
  countShadow,
  overviewCamera,
  shadowCamera,
} from './sceneCount.ts';

// Stub document — builder memakai canvas 2D untuk tekstur (jendela,
// layar panggung, label nama). Dipasang sebelum builder dipanggil.
const ctxStub = new Proxy(
  {},
  {
    get(_t, p: string | symbol) {
      if (p === 'createLinearGradient') return () => ({ addColorStop: () => {} });
      return () => ({});
    },
    set() {
      return true;
    },
  },
);
(globalThis as Record<string, unknown>).document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctxStub }),
};

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed += 1;
    console.log(`  lulus: ${name}`);
  } else {
    failed += 1;
    console.log(`  GAGAL: ${name} ${detail}`);
  }
}

interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

function rectOf(b: BuildingFootprint): Rect {
  return { x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2 };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}

/** Jarak titik ke persegi (0 bila di dalam). */
function distPointRect(x: number, z: number, r: Rect): number {
  const dx = Math.max(r.x0 - x, 0, x - r.x1);
  const dz = Math.max(r.z0 - z, 0, z - r.z1);
  return Math.hypot(dx, dz);
}

/** True bila ruas (x1,z1)-(x2,z2) memotong persegi (Liang–Barsky). */
function segmentHitsRect(x1: number, z1: number, x2: number, z2: number, r: Rect): boolean {
  const dx = x2 - x1;
  const dz = z2 - z1;
  let t0 = 0;
  let t1 = 1;
  const ps = [-dx, dx, -dz, dz];
  const qs = [x1 - r.x0, r.x1 - x1, z1 - r.z0, r.z1 - z1];
  for (let i = 0; i < 4; i++) {
    if (ps[i] === 0) {
      if (qs[i] < 0) return false;
    } else {
      const t = qs[i] / ps[i];
      if (ps[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

// ---------- 1. Penempatan gedung baru ----------
const scene0 = new THREE.Scene();
const city = buildCity(scene0);
const oldBuildings = city.info.buildings.filter((b) => !NEW_BUILDINGS.some((n) => n.id === b.id));
const newRects = NEW_BUILDINGS.map((b) => ({ id: b.id, rect: rectOf(b) }));
const oldRects = oldBuildings.map((b) => ({ id: b.id, rect: rectOf(b) }));
const roadRects: Rect[] = [
  { x0: -3, x1: 3, z0: -42, z1: 42 },
  { x0: -42, x1: 42, z0: -3, z1: 3 },
];
const roomPads = [
  { id: 'room-1', x: 0, z: -15 },
  { id: 'room-2', x: 0, z: 0 },
  { id: 'room-3', x: -23, z: 13 },
  { id: 'room-4', x: 15, z: -12 },
  { id: 'room-5', x: -15, z: -12 },
  { id: 'room-6', x: 6, z: 22 },
];

console.log('== 8.2: penempatan gedung baru ==');
check('12 footprint baru terdaftar di CityInfo', NEW_BUILDINGS.length === 12, `dapat ${NEW_BUILDINGS.length}`);
check(
  'semua footprint baru di dalam batas ±45',
  NEW_BUILDINGS.every((b) => Math.abs(b.x) + b.w / 2 <= 45 && Math.abs(b.z) + b.d / 2 <= 45),
);
check(
  'footprint baru tidak menabrak gedung lama',
  newRects.every((n) => oldRects.every((o) => !rectsOverlap(n.rect, o.rect))),
  newRects.filter((n) => oldRects.some((o) => rectsOverlap(n.rect, o.rect))).map((n) => n.id).join(','),
);
check(
  'footprint baru tidak saling menabrak',
  newRects.every((a, i) => newRects.every((b, j) => i >= j || !rectsOverlap(a.rect, b.rect))),
);
check(
  'footprint baru tidak menabrak jalan',
  newRects.every((n) => roadRects.every((r) => !rectsOverlap(n.rect, r))),
  newRects.filter((n) => roadRects.some((r) => rectsOverlap(n.rect, r))).map((n) => n.id).join(','),
);
check(
  'footprint baru berjarak >=1,5 dari pohon (titik terdekat 1,58: lapak vs pohon (-6,38))',
  newRects.every((n) => city.info.trees.every((t) => distPointRect(t.x, t.z, n.rect) >= 1.5)),
  newRects
    .map((n) => ({ id: n.id, d: Math.min(...city.info.trees.map((t) => distPointRect(t.x, t.z, n.rect))) }))
    .filter((x) => x.d < 1.5)
    .map((x) => `${x.id}:${x.d.toFixed(2)}`)
    .join(','),
);
check(
  'footprint baru berjarak >2,6 dari alas ruang meeting (tidak menutup room)',
  newRects.every((n) => roomPads.every((r) => distPointRect(r.x, r.z, n.rect) > 2.6)),
);
check(
  'footprint baru tidak menabrak pohon yang sama dengan bangunan lama (semua pohon kota tetap di luar footprint)',
  city.info.trees.every((t) => newRects.every((n) => distPointRect(t.x, t.z, n.rect) > 0)),
);

// ---------- 2. Graf navigasi baru ----------
console.log('== 8.2: graf navigasi ==');
const OLD_NODE_IDS = ['plaza', 'roadN', 'roadS', 'roadE', 'roadW', 'office', 'arena', 'stage', 'park', 'resE', 'resW'];
const NEW_NODE_IDS = ['mosque', 'school', 'roadNE', 'clinic', 'tower', 'shop', 'market', 'playground', 'pool'];
check('11 simpul lama tetap ada', OLD_NODE_IDS.every((id) => getNode(id) !== undefined));
check('9 simpul baru ditambahkan (total 20)', NAV_NODES.length === 20, `dapat ${NAV_NODES.length}`);
check(
  'graf tetap terhubung: BFS dari plaza mencapai semua simpul',
  NAV_NODES.every((n) => findPath('plaza', n.id).length > 0 && findPath('plaza', n.id)[findPath('plaza', n.id).length - 1] === n.id),
);
// 'park' (Taman) DIKECUALIKAN dari daftar gedung padat: taman adalah ruang
// terbuka yang memang dimasuki agent — simpul 'park' (-23,13) berada di
// TENGAH footprint taman sejak Phase 3, jadi sisi roadW→park pasti
// "menembus" persegi taman. Itu perilaku yang dirancang, bukan tabrakan;
// gedung padat (kantor/arena/panggung/rumah + 12 footprint baru) tetap
// diperiksa penuh di bawah.
const solidRects = [...oldRects, ...newRects].filter((r) => r.id !== 'park').map((r) => r.rect);
const EDGES: [string, string][] = [
  ['plaza', 'roadN'], ['plaza', 'roadS'], ['plaza', 'roadE'], ['plaza', 'roadW'],
  ['roadS', 'office'], ['roadS', 'arena'], ['roadS', 'stage'], ['roadE', 'arena'],
  ['roadW', 'stage'], ['roadW', 'park'], ['roadN', 'resE'], ['roadN', 'resW'],
  ['resW', 'mosque'], ['stage', 'school'], ['roadS', 'roadNE'], ['roadNE', 'clinic'],
  ['clinic', 'tower'], ['resE', 'shop'], ['shop', 'market'], ['shop', 'playground'], ['roadE', 'pool'],
];
const badEdges = EDGES.filter(([a, b]) => {
  const na = getNode(a);
  const nb = getNode(b);
  if (!na || !nb) return true;
  return solidRects.some((r) => segmentHitsRect(na.x, na.z, nb.x, nb.z, r));
});
check('tidak ada sisi graf yang menembus gedung padat (taman = ruang terbuka, dikecualikan)', badEdges.length === 0, JSON.stringify(badEdges));
check(
  'simpul baru berada di luar footprint bangunannya sendiri',
  NEW_NODE_IDS.every((id) => {
    const n = getNode(id);
    if (!n) return false;
    const fp = NEW_BUILDINGS.find((b) => b.id === id);
    if (!fp) return true; // roadNE bukan bangunan
    return distPointRect(n.x, n.z, rectOf(fp)) > 0;
  }),
);

// ---------- 3. Hewan ----------
console.log('== 8.2: hewan ambient ==');
const animalScene = new THREE.Scene();
const animals = new Animals(animalScene);
check(
  'jumlah hewan: 2 kucing + 2 anjing + 3 bebek',
  animals.getPositions().filter((p) => p.kind === 'cat').length === ANIMAL_COUNTS.cat &&
    animals.getPositions().filter((p) => p.kind === 'dog').length === ANIMAL_COUNTS.dog &&
    animals.getPositions().filter((p) => p.kind === 'duck').length === ANIMAL_COUNTS.duck,
);
// Simulasikan 600 dtk (1 hari simulasi) — posisi harus tetap di area.
let t = 0;
let outOfBounds = '';
for (let i = 0; i < 6000; i++) {
  t += 0.1;
  animals.update(0.1, t);
  for (const p of animals.getPositions()) {
    if (p.kind === 'cat') {
      if (Math.hypot(p.x - ANIMAL_ROAM.cat.cx, p.z - ANIMAL_ROAM.cat.cz) > ANIMAL_ROAM.cat.r + 1e-6) outOfBounds = `kucing di (${p.x.toFixed(2)},${p.z.toFixed(2)})`;
    } else if (p.kind === 'dog') {
      if (Math.hypot(p.x - ANIMAL_ROAM.dog.cx, p.z - ANIMAL_ROAM.dog.cz) > ANIMAL_ROAM.dog.r + 1e-6) outOfBounds = `anjing di (${p.x.toFixed(2)},${p.z.toFixed(2)})`;
    } else {
      if (p.x < ANIMAL_ROAM.duck.x0 - 1e-6 || p.x > ANIMAL_ROAM.duck.x1 + 1e-6 || p.z < ANIMAL_ROAM.duck.z0 - 1e-6 || p.z > ANIMAL_ROAM.duck.z1 + 1e-6) {
        outOfBounds = `bebek di (${p.x.toFixed(2)},${p.z.toFixed(2)})`;
      }
    }
  }
  if (outOfBounds) break;
}
check('hewan tetap dalam area jelajah setelah 600 dtk simulasi', outOfBounds === '', outOfBounds);
let animalMeshes = 0;
let animalShadowCasters = 0;
animalScene.traverse((o) => {
  if ((o as THREE.Mesh).isMesh) {
    animalMeshes += 1;
    if ((o as THREE.InstancedMesh).isInstancedMesh && (o as THREE.Mesh).castShadow) animalShadowCasters += 1;
  }
});
check('hewan = 11 InstancedMesh (kucing 4 + anjing 4 + bebek 3)', animalMeshes === 11, `dapat ${animalMeshes}`);
check('hewan tidak melempar bayangan (0 shadow caster)', animalShadowCasters === 0, `dapat ${animalShadowCasters}`);

// ---------- 4. Draw call baru (metode 7.1) ----------
console.log('== 8.2: draw call ==');
const replicaNoAnimals = buildReplicaScene(false);
const mainNoAnimals = countMain(replicaNoAnimals, overviewCamera(16 / 9));
const shadowNoAnimals = countShadow(replicaNoAnimals, shadowCamera());
check('main tanpa hewan = 231 (konsisten dengan phase71)', mainNoAnimals.total === 231, `dapat ${mainNoAnimals.total}`);
check('shadow tanpa hewan = 109 (konsisten dengan phase71)', shadowNoAnimals.total === 109, `dapat ${shadowNoAnimals.total}`);
const replica = buildReplicaScene(true);
const main = countMain(replica, overviewCamera(16 / 9));
const shadow = countShadow(replica, shadowCamera());
check('main dengan hewan = 242 (231 + 11 hewan)', main.total === 242, `dapat ${main.total}`);
check('hewan di main pass = 11', (main.byTag['hewan'] ?? 0) === 11, JSON.stringify(main.byTag));
check('shadow dengan hewan = 109 (hewan tanpa bayangan)', shadow.total === 109, `dapat ${shadow.total}`);
check('hewan di shadow pass = 0', (shadow.byTag['hewan'] ?? 0) === 0, JSON.stringify(shadow.byTag));
check('HUD total baru = 242 + 109 = 351', main.total + shadow.total === 351);

// ---------- 5. Suasana senja ----------
console.log('== 8.2: suasana senja ==');
const sore = environmentTargets('sore', 'cerah');
check('langit Sore jingga hangat (0xe8894f)', sore.sky.getHex() === 0xe8894f, `dapat 0x${sore.sky.getHex().toString(16)}`);
check('matahari Sore hangat (0xff9e4a)', sore.sunColor.getHex() === 0xff9e4a, `dapat 0x${sore.sunColor.getHex().toString(16)}`);
check('intensitas Sore (1,1) lebih redup dari Siang (1,9)', sore.sunIntensity === 1.1 && environmentTargets('siang', 'cerah').sunIntensity === 1.9);
check('matahari Sore rendah (y=10) di barat (x=30)', sore.sunPos.y === 10 && sore.sunPos.x === 30, `dapat (${sore.sunPos.x},${sore.sunPos.y},${sore.sunPos.z})`);
check('matahari Pagi/Siang tetap tinggi (y>=30)', environmentTargets('pagi', 'cerah').sunPos.y >= 30 && environmentTargets('siang', 'cerah').sunPos.y >= 30);
// Phase 9: langit Siang dihangatkan (0x9ecfec -> 0xbcd9e6); Malam tetap.
check('langit Siang dihangatkan Phase 9 (0xbcd9e6) dan Malam (0x232f45) tidak berubah', environmentTargets('siang', 'cerah').sky.getHex() === 0xbcd9e6 && environmentTargets('malam', 'cerah').sky.getHex() === 0x232f45);
check('hujan tetap menimpa langit senja (0x7d8ea3)', environmentTargets('sore', 'hujan').sky.getHex() === 0x7d8ea3);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
