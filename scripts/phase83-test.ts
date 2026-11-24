// Uji logika murni Phase 8.3 — Builder 21 item. Dijalankan lewat bundle
// rolldown (lihat scripts/run-all-tests.sh; `node scripts/phase83-test.ts`
// langsung gagal karena import tanpa ekstensi gaya Vite — bukan cacat).
// Yang diuji: katalog 21 item; validasi penempatan (batas + footprint,
// footprint gedung tetap 8.2 sebagai penghalang, jarak minimum, bebek
// hanya di kolam); label + putaran tersimpan (store + mesh 3D); hewan
// Builder tetap dalam radius jelajah; muat simpanan lama (tanpa label /
// tanpa rotY); entri minimap; draw call dasar tidak berubah (363).
// Bukan uji UI/browser; tampilan visual diverifikasi live oleh parent.
import * as THREE from 'three';
import { buildCity } from '../src/world/buildings/city.ts';
import { NEW_BUILDINGS } from '../src/world/buildings/district.ts';
import {
  WORLD_OBJECT_CATALOG,
  WORLD_OBJECT_KIND_ORDER,
  type WorldObjectKind,
} from '../src/types/worldObject.ts';
import {
  defaultRotation,
  getPoolRect,
  validatePlacement,
} from '../src/simulation/builderLogic.ts';
import { WorldObjectStore, normalizeLabel } from '../src/simulation/worldObjectStore.ts';
import { buildWorldObject } from '../src/world/buildings/props.ts';
import { BuilderAnimals, BUILDER_ROAM_RADIUS } from '../src/world/animals/BuilderAnimals.ts';
import { ANIMAL_ROAM } from '../src/world/animals/Animals.ts';
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

// Stub localStorage untuk Node.
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v);
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
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

function near(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

function countMeshes(g: THREE.Group): { meshes: number; instanced: number; shadowCasters: number } {
  let meshes = 0;
  let instanced = 0;
  let shadowCasters = 0;
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      meshes += 1;
      if ((o as THREE.InstancedMesh).isInstancedMesh) instanced += 1;
      if ((o as THREE.Mesh).castShadow) shadowCasters += 1;
    }
  });
  return { meshes, instanced, shadowCasters };
}

// ---------- 1. Katalog 21 item ----------
console.log('== 8.3: katalog 21 item ==');
const EXPECTED_KINDS: WorldObjectKind[] = [
  'tree', 'lamp', 'bench', 'fountain', 'glassTower', 'office', 'shop', 'house',
  'school', 'clinic', 'mosque', 'playground', 'market', 'busstop', 'pool', 'car',
  'flowerbed', 'cafeTable', 'cat', 'dog', 'duck',
];
check('katalog berisi 21 jenis', Object.keys(WORLD_OBJECT_CATALOG).length === 21, `dapat ${Object.keys(WORLD_OBJECT_CATALOG).length}`);
check(
  'katalog berisi tepat 21 nama acuan',
  EXPECTED_KINDS.every((k) => k in WORLD_OBJECT_CATALOG) && Object.keys(WORLD_OBJECT_CATALOG).every((k) => (EXPECTED_KINDS as string[]).includes(k)),
);
check(
  'urutan katalog 21 item, tanpa duplikat',
  WORLD_OBJECT_KIND_ORDER.length === 21 && new Set(WORLD_OBJECT_KIND_ORDER).size === 21 &&
    EXPECTED_KINDS.every((k) => WORLD_OBJECT_KIND_ORDER.includes(k)),
);
check(
  'semua entri punya label + hint + warna + ukuran footprint positif',
  Object.values(WORLD_OBJECT_CATALOG).every(
    (d) => d.label.length > 0 && d.hint.length > 0 && d.color.length > 0 && d.size[0] > 0 && d.size[1] > 0,
  ),
);
check(
  'label katalog cocok dengan nama acuan',
  WORLD_OBJECT_CATALOG.glassTower.label === 'Menara kaca' &&
    WORLD_OBJECT_CATALOG.office.label === 'Gedung kantor' &&
    WORLD_OBJECT_CATALOG.shop.label === 'Toko' &&
    WORLD_OBJECT_CATALOG.house.label === 'Rumah' &&
    WORLD_OBJECT_CATALOG.school.label === 'Sekolah' &&
    WORLD_OBJECT_CATALOG.clinic.label === 'Klinik' &&
    WORLD_OBJECT_CATALOG.mosque.label === 'Masjid' &&
    WORLD_OBJECT_CATALOG.playground.label === 'Taman bermain' &&
    WORLD_OBJECT_CATALOG.market.label === 'Lapak pasar' &&
    WORLD_OBJECT_CATALOG.busstop.label === 'Halte bus' &&
    WORLD_OBJECT_CATALOG.pool.label === 'Kolam' &&
    WORLD_OBJECT_CATALOG.car.label === 'Mobil parkir' &&
    WORLD_OBJECT_CATALOG.flowerbed.label === 'Taman bunga' &&
    WORLD_OBJECT_CATALOG.cafeTable.label === 'Meja kafe' &&
    WORLD_OBJECT_CATALOG.cat.label === 'Kucing (berkeliaran)' &&
    WORLD_OBJECT_CATALOG.dog.label === 'Anjing (berkeliaran)' &&
    WORLD_OBJECT_CATALOG.duck.label === 'Bebek (berenang)',
);

// ---------- 2. Validasi penempatan ----------
console.log('== 8.3: validasi penempatan ==');
const scene0 = new THREE.Scene();
const city = buildCity(scene0);
const buildings = city.info.buildings;
check('CityInfo memuat 12 footprint 8.2', NEW_BUILDINGS.every((n) => buildings.some((b) => b.id === n.id)));
check(
  'batas memakai footprint: gedung kantor di x=38 ditolak (38+2,5>40)',
  validatePlacement(38, 0, [], buildings, undefined, 'office') !== null,
);
check(
  'batas memakai footprint: gedung kantor di x=37 diterima (37+2,5<=40)',
  validatePlacement(37, 0, [], buildings, undefined, 'office') === null,
);
check(
  'lampu di x=40 ditolak (40+0,25>40)',
  validatePlacement(40, 0, [], buildings, undefined, 'lamp') !== null,
);
check(
  'pohon di atas masjid 8.2 (-36,33) ditolak',
  validatePlacement(-36, 33, [], buildings, undefined, 'tree') !== null,
);
check(
  'toko di atas toko 8.2 (8,34) ditolak',
  validatePlacement(8, 34, [], buildings, undefined, 'shop') !== null,
);
check(
  'bangku di atas kolam 8.2 (29,20) ditolak sebagai "Kolam Renang"',
  validatePlacement(29, 20, [], buildings, undefined, 'bench') === 'Terlalu dekat dengan Kolam Renang.',
);
check(
  'pohon di atas halte 8.2 (20,4.5) ditolak',
  validatePlacement(20, 4.5, [], buildings, undefined, 'tree') !== null,
);
check(
  'pohon di atas sekolah 8.2 (-24,-34) ditolak',
  validatePlacement(-24, -34, [], buildings, undefined, 'tree') !== null,
);
check(
  'di tepi masjid (margin 1) ditolak: pohon di (-30.5,33)',
  validatePlacement(-30.5, 33, [], buildings, undefined, 'tree') !== null,
);
check(
  'di luar margin masjid diterima: pohon di (-30,33)',
  validatePlacement(-30, 33, [], buildings, undefined, 'tree') === null,
);
const existingTree = [{ id: 'o1', kind: 'tree' as const, x: 10, z: 10, rotY: 0, createdAt: '' }];
check(
  'jarak tepi-ke-tepi <1,5 ditolak: pohon di (11.5,10) dekat pohon (10,10)',
  validatePlacement(11.5, 10, existingTree, buildings, undefined, 'tree') !== null,
);
check(
  'jarak tepi-ke-tepi tepat 1,5 diterima: pohon di (13,10)',
  validatePlacement(13, 10, existingTree, buildings, undefined, 'tree') === null,
);
check(
  'memindah mengabaikan diri sendiri (ignoreId)',
  validatePlacement(10, 10, existingTree, buildings, 'o1', 'tree') === null,
);
check(
  'bebek di luar kolam ditolak dengan pesan jelas',
  validatePlacement(0, 0, [], buildings, undefined, 'duck') === 'Bebek hanya bisa ditempatkan di kolam.',
);
check(
  'bebek di tengah kolam (29,20) diterima',
  validatePlacement(29, 20, [], buildings, undefined, 'duck') === null,
);
check(
  'bebek di tepi dalam kolam (25,20) diterima',
  validatePlacement(25, 20, [], buildings, undefined, 'duck') === null,
);
check(
  'bebek di tepi luar air (24,20) ditolak',
  validatePlacement(24, 20, [], buildings, undefined, 'duck') === 'Bebek hanya bisa ditempatkan di kolam.',
);
check(
  'persegi kolam dari district.ts: air (24.6–33.4, 17.6–22.4)',
  (() => {
    const r = getPoolRect();
    return near(r.x0, 24.6) && near(r.x1, 33.4) && near(r.z0, 17.6) && near(r.z1, 22.4);
  })(),
);
check(
  'rumput kosong tetap diterima (tanpa jenis, kompatibel Phase 6)',
  validatePlacement(10, 10, [], buildings) === null,
);

// ---------- 3. Store: label + putaran + simpanan lama ----------
console.log('== 8.3: store label + putaran ==');
mem.clear();
const store = new WorldObjectStore();
check('seed: 2 objek contoh', store.getObjects().length === 2);
const shop = store.addObject({ kind: 'shop', x: 12, z: 12, label: 'Toko Kopi', rotY: Math.PI / 2 });
check(
  'label + putaran tersimpan saat menambah',
  shop.label === 'Toko Kopi' && near(shop.rotY, Math.PI / 2),
  `label=${shop.label} rotY=${shop.rotY}`,
);
const plain = store.addObject({ kind: 'tree', x: -12, z: 12 });
check(
  'tanpa label/putaran: label kosong + rotY default 0 (pohon)',
  plain.label === '' && plain.rotY === 0,
);
const benchObj = store.addObject({ kind: 'bench', x: 12, z: -12 });
check(
  'tanpa putaran: bangku tetap menghadap plaza',
  near(benchObj.rotY, defaultRotation('bench', 12, -12)),
);
store.moveObject(shop.id, -12, -12, Math.PI, 'Toko Pindah');
const moved = store.getObjects().find((o) => o.id === shop.id);
check(
  'pindah mengubah posisi + putaran + label sekaligus',
  moved?.x === -12 && moved?.z === -12 && near(moved?.rotY ?? 0, Math.PI) && moved?.label === 'Toko Pindah',
);
store.moveObject(shop.id, 5, 5);
const movedBack = store.getObjects().find((o) => o.id === shop.id);
check(
  'pindah tanpa putaran: rotY kembali ke default (toko = 0), label tetap',
  near(movedBack?.rotY ?? 9, 0) && movedBack?.label === 'Toko Pindah',
);
check('label dipangkas ke 40 karakter', normalizeLabel('x'.repeat(50)).length === 40);
check('label di-trim', normalizeLabel('  Toko  ') === 'Toko');
const long = store.addObject({ kind: 'lamp', x: 0, z: 30, label: 'y'.repeat(60) });
check('label panjang tersimpan terpangkas 40', (long.label ?? '').length === 40);
const store2 = new WorldObjectStore();
check('objek tersimpan di localStorage (muat ulang)', store2.getObjects().length === 6);

// Simpanan lama (sebelum 8.3): tanpa label, satu tanpa rotY, satu jenis tak dikenal.
mem.clear();
mem.set(
  'living-world-objects-v1',
  JSON.stringify([
    { id: 'old-1', kind: 'tree', x: 1, z: 1, createdAt: '' },
    { id: 'old-2', kind: 'bench', x: 2, z: 2, rotY: 1.2, createdAt: '' },
    { id: 'old-3', kind: 'nope', x: 3, z: 3, createdAt: '' },
  ]),
);
const oldStore = new WorldObjectStore();
const olds = oldStore.getObjects();
check('simpanan lama termuat (jenis tak dikenal dibuang)', olds.length === 2, `dapat ${olds.length}`);
const oldTree = olds.find((o) => o.id === 'old-1');
check(
  'objek lama tanpa label/rotY: label kosong + rotY default 0',
  oldTree?.label === '' && oldTree?.rotY === 0,
);
const oldBench = olds.find((o) => o.id === 'old-2');
check(
  'objek lama dengan rotY: rotY 1,2 dipertahankan + label kosong',
  near(oldBench?.rotY ?? 0, 1.2) && oldBench?.label === '',
);

// ---------- 4. Pembangun 3D ----------
console.log('== 8.3: pembangun 3D ==');
const STATIC_KINDS: WorldObjectKind[] = [
  'tree', 'bench', 'lamp', 'fountain', 'glassTower', 'office', 'shop', 'house',
  'school', 'clinic', 'mosque', 'playground', 'market', 'busstop', 'pool', 'car',
  'flowerbed', 'cafeTable',
];
let allStaticOk = true;
for (const kind of STATIC_KINDS) {
  const g = buildWorldObject(kind, 3, 4, 1.2);
  const c = countMeshes(g);
  if (c.meshes === 0 || !near(g.rotation.y, 1.2) || g.position.x !== 3 || g.position.z !== 4) {
    allStaticOk = false;
    console.log(`  jenis bermasalah: ${kind} (mesh ${c.meshes}, rotY ${g.rotation.y})`);
  }
}
check('18 jenis statis membangun grup berisi mesh + posisi/putaran diterapkan', allStaticOk);
check(
  'hewan TIDAK dibangun oleh buildWorldObject (grup kosong — dirender BuilderAnimals)',
  (['cat', 'dog', 'duck'] as WorldObjectKind[]).every((k) => buildWorldObject(k, 0, 0, 0).children.length === 0),
);
const marketGroup = buildWorldObject('market', 0, 0, 0);
const marketCount = countMeshes(marketGroup);
check('lapak pasar = 4 InstancedMesh (meja/atap/tiang/peti)', marketCount.meshes === 4 && marketCount.instanced === 4, JSON.stringify(marketCount));
const carGroup = buildWorldObject('car', 0, 0, 0);
const carCount = countMeshes(carGroup);
check('mobil = 3 mesh (badan/kabin/roda instanced)', carCount.meshes === 3 && carCount.instanced === 1, JSON.stringify(carCount));
const flowerGroup = buildWorldObject('flowerbed', 0, 0, 0);
const flowerCount = countMeshes(flowerGroup);
check('taman bunga = 3 mesh (bedeng/kepala instanced/tangkai instanced)', flowerCount.meshes === 3 && flowerCount.instanced === 2, JSON.stringify(flowerCount));
const playgroundGroup = buildWorldObject('playground', 0, 0, 0);
const playgroundCount = countMeshes(playgroundGroup);
check('taman bermain memakai InstancedMesh (kursi + tali ayunan)', playgroundCount.instanced === 2, JSON.stringify(playgroundCount));
const busstopGroup = buildWorldObject('busstop', 0, 0, 0);
check('halte memakai InstancedMesh (tiang)', countMeshes(busstopGroup).instanced === 1, JSON.stringify(countMeshes(busstopGroup)));
const cafeGroup = buildWorldObject('cafeTable', 0, 0, 0);
check('meja kafe memakai InstancedMesh (dudukan + sandaran kursi)', countMeshes(cafeGroup).instanced === 2, JSON.stringify(countMeshes(cafeGroup)));
const towerGroup = buildWorldObject('glassTower', 0, 0, 0);
let glassOk = false;
towerGroup.traverse((o) => {
  const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
  if (mat && mat.transparent && near(mat.opacity, 0.55)) glassOk = true;
});
check('menara kaca: material transparan mengilap (opacity 0,55)', glassOk);
check(
  'kolam builder = 2 mesh (tepi + air)',
  countMeshes(buildWorldObject('pool', 0, 0, 0)).meshes === 2,
);

// ---------- 5. Hewan Builder ----------
console.log('== 8.3: hewan Builder ==');
const animalScene = new THREE.Scene();
const builderAnimals = new BuilderAnimals(animalScene);
builderAnimals.setAnimals([
  { kind: 'cat', x: 0, z: 0 },
  { kind: 'cat', x: 5, z: 5 },
  { kind: 'dog', x: 10, z: 10 },
  { kind: 'duck', x: 29, z: 20 },
]);
check('4 hewan Builder terdaftar (2 kucing + 1 anjing + 1 bebek)', builderAnimals.getCount() === 4);
let builderMeshes = 0;
let builderShadowCasters = 0;
animalScene.traverse((o) => {
  if ((o as THREE.Mesh).isMesh) {
    builderMeshes += 1;
    if ((o as THREE.Mesh).castShadow) builderShadowCasters += 1;
  }
});
check('hewan Builder = 11 InstancedMesh (kucing 4 + anjing 4 + bebek 3)', builderMeshes === 11, `dapat ${builderMeshes}`);
check('hewan Builder tanpa bayangan', builderShadowCasters === 0, `dapat ${builderShadowCasters}`);
// Simulasikan 600 dtk — posisi harus tetap dalam radius jelajah rumahnya.
let t = 0;
let outOfBounds = '';
for (let i = 0; i < 6000; i++) {
  t += 0.1;
  builderAnimals.update(0.1, t);
  for (const p of builderAnimals.getPositions()) {
    if (p.kind === 'duck') {
      if (p.x < ANIMAL_ROAM.duck.x0 - 1e-6 || p.x > ANIMAL_ROAM.duck.x1 + 1e-6 || p.z < ANIMAL_ROAM.duck.z0 - 1e-6 || p.z > ANIMAL_ROAM.duck.z1 + 1e-6) {
        outOfBounds = `bebek di (${p.x.toFixed(2)},${p.z.toFixed(2)})`;
      }
    } else if (Math.hypot(p.x - p.homeX, p.z - p.homeZ) > BUILDER_ROAM_RADIUS + 1e-6) {
      outOfBounds = `${p.kind} di (${p.x.toFixed(2)},${p.z.toFixed(2)}) rumah (${p.homeX},${p.homeZ})`;
    }
  }
  if (outOfBounds) break;
}
check('hewan Builder tetap dalam radius jelajah setelah 600 dtk simulasi', outOfBounds === '', outOfBounds);
builderAnimals.setAnimals([]);
check('setAnimals([]) mengosongkan hewan + mesh', builderAnimals.getCount() === 0 && builderAnimals.group.children.length === 0);
builderAnimals.setAnimals([{ kind: 'dog', x: -10, z: -10 }]);
check('setAnimals ulang: 1 anjing = 4 InstancedMesh', builderAnimals.getCount() === 1 && builderAnimals.group.children.length === 4);

// ---------- 6. Minimap ----------
console.log('== 8.3: minimap ==');
check(
  'semua jenis katalog punya warna heks valid (titik minimap)',
  Object.values(WORLD_OBJECT_CATALOG).every((d) => /^#[0-9a-f]{6}$/i.test(d.color)),
);

// ---------- 7. Draw call dasar tidak berubah ----------
console.log('== 8.3: draw call dasar ==');
const replicaNoAnimals = buildReplicaScene(false);
const mainNoAnimals = countMain(replicaNoAnimals, overviewCamera(16 / 9));
const shadowNoAnimals = countShadow(replicaNoAnimals, shadowCamera());
check('main tanpa hewan tetap 231 (katalog saja tidak menambah mesh dasar)', mainNoAnimals.total === 231, `dapat ${mainNoAnimals.total}`);
check('shadow tanpa hewan tetap 109', shadowNoAnimals.total === 109, `dapat ${shadowNoAnimals.total}`);
const replica = buildReplicaScene(true);
const main = countMain(replica, overviewCamera(16 / 9));
const shadow = countShadow(replica, shadowCamera());
check('main dengan hewan tetap 242', main.total === 242, `dapat ${main.total}`);
check('shadow dengan hewan tetap 109', shadow.total === 109, `dapat ${shadow.total}`);
check('HUD total tetap 242 + 109 = 351', main.total + shadow.total === 351);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
