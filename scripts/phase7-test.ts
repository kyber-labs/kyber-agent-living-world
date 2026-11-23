// Uji logika murni Phase 7 — dijalankan lewat bundle rolldown
// (lihat scripts/run-all-tests.sh; `node scripts/phase7-test.ts`
// langsung gagal karena import tanpa ekstensi gaya Vite — bukan cacat).
// Mencakup: pelacak FPS (FpsTracker + averageFps) dan helper matriks
// instancing kota (pohon, marka jalan, rumah) — bagian yang paling
// berisiko salah saat mengubah Mesh individual menjadi InstancedMesh.
// Matriks diuji elemen per elemen terhadap posisi/rotasi/skala Mesh
// aslinya. Bukan uji UI/browser.
import { FpsTracker, averageFps, FPS_WINDOW } from '../src/simulation/fps.ts';
import {
  treeTrunkMatrix,
  treeFoliageMatrix,
  dashMatrix,
  houseBodyMatrix,
  houseRoofMatrix,
  houseDoorMatrix,
} from '../src/world/buildings/city.ts';

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

function approx(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) < eps;
}

// ---------- FpsTracker / averageFps ----------

check('averageFps: tanpa data -> 0', averageFps([]) === 0);

const steady60 = Array.from({ length: 60 }, () => 1000 / 60);
check('averageFps: delta tetap 16,67 ms -> 60', averageFps(steady60) === 60);

const steady30 = Array.from({ length: 30 }, () => 1000 / 30);
check('averageFps: delta tetap 33,33 ms -> 30', averageFps(steady30) === 30);

const mixed = [...Array.from({ length: 30 }, () => 1000 / 60), ...Array.from({ length: 30 }, () => 1000 / 30)];
check('averageFps: campuran 16,67/33,33 ms -> 40', averageFps(mixed) === 40);

check(
  'averageFps: delta tidak valid (0 / negatif / >=1000) diabaikan',
  averageFps([1000 / 60, 0, -5, 1500, 1000 / 60]) === 60,
);

const tracker0 = new FpsTracker();
check('FpsTracker: belum ada frame -> 0 FPS', tracker0.getFps() === 0);

const tracker60 = new FpsTracker();
let t = 0;
for (let i = 0; i < 60; i++) {
  tracker60.push(t);
  t += 1000 / 60;
}
check('FpsTracker: 60 frame @16,67 ms -> 60 FPS', tracker60.getFps() === 60);

const tracker30 = new FpsTracker();
t = 0;
for (let i = 0; i < 30; i++) {
  tracker30.push(t);
  t += 1000 / 30;
}
check('FpsTracker: 30 frame @33,33 ms -> 30 FPS', tracker30.getFps() === 30);

const trackerPause = new FpsTracker();
t = 0;
for (let i = 0; i < 30; i++) {
  trackerPause.push(t);
  t += 1000 / 60;
}
trackerPause.push(t + 5000); // jeda 5 detik (tab disembunyikan) — diabaikan
trackerPause.push(t + 5000 + 1000 / 60);
check('FpsTracker: jeda panjang diabaikan, FPS tetap 60', trackerPause.getFps() === 60);

const trackerCap = new FpsTracker();
t = 0;
for (let i = 0; i < 200; i++) {
  trackerCap.push(t);
  t += 1000 / 60;
}
check(
  `FpsTracker: jendela dibatasi ${FPS_WINDOW} sampel`,
  trackerCap.sampleCount === FPS_WINDOW && trackerCap.getFps() === 60,
);

const trackerDup = new FpsTracker();
trackerDup.push(1000);
trackerDup.push(1000); // delta 0 — diabaikan
trackerDup.push(1000 + 1000 / 60);
check('FpsTracker: dua push di milidetik yang sama diabaikan', trackerDup.getFps() === 60);

// ---------- Matriks instancing kota ----------

const trunk = treeTrunkMatrix(10, -20, 1.15).elements;
check(
  'pohon batang: posisi (10, 0,45×1,15, -20) + skala 1,15',
  approx(trunk[12], 10) && approx(trunk[13], 0.45 * 1.15) && approx(trunk[14], -20) &&
    approx(trunk[0], 1.15) && approx(trunk[5], 1.15) && approx(trunk[10], 1.15),
  `e=${trunk.slice(0, 16).map((v) => v.toFixed(3)).join(',')}`,
);

const foliage = treeFoliageMatrix(10, -20, 1.15).elements;
check(
  'pohon tajuk: posisi y 1,5×1,15 + skala 1,15',
  approx(foliage[12], 10) && approx(foliage[13], 1.5 * 1.15) && approx(foliage[14], -20) &&
    approx(foliage[0], 1.15),
);

const dash = dashMatrix(0, -12).elements;
check(
  'marka jalan: posisi (0, 0,02, -12) + rebah -90° sumbu X',
  approx(dash[12], 0) && approx(dash[13], 0.02) && approx(dash[14], -12) &&
    approx(dash[0], 1) && approx(dash[5], 0) && approx(dash[6], -1) && approx(dash[9], 1),
  `e=${dash.slice(0, 16).map((v) => v.toFixed(3)).join(',')}`,
);

const body = houseBodyMatrix(-20, 18).elements;
check(
  'rumah badan: posisi (-20, 1,3, 18), tanpa rotasi/skala',
  approx(body[12], -20) && approx(body[13], 1.3) && approx(body[14], 18) &&
    approx(body[0], 1) && approx(body[5], 1) && approx(body[10], 1),
);

const roof = houseRoofMatrix(-20, 18).elements;
const cos45 = Math.cos(Math.PI / 4);
check(
  'rumah atap: y 3,45 + putar 45° + pipih 0,85',
  approx(roof[13], 3.45) && approx(roof[0], cos45) && approx(roof[2], -cos45) &&
    approx(roof[8], 0.85 * cos45) && approx(roof[10], 0.85 * cos45),
  `e=${roof.slice(0, 16).map((v) => v.toFixed(3)).join(',')}`,
);

const door = houseDoorMatrix(-20, 18).elements;
check(
  'rumah pintu: posisi (-20, 0,8, 16,22) + menghadap utara (rotY π)',
  approx(door[12], -20) && approx(door[13], 0.8) && approx(door[14], 18 - 1.78) &&
    approx(door[0], -1) && approx(door[10], -1),
);

const trunkA = treeTrunkMatrix(0, 0, 1);
const trunkB = treeTrunkMatrix(5, 5, 2);
check(
  'matriks: tiap panggilan menghasilkan objek baru (tidak berbagi state)',
  trunkA !== trunkB && approx(trunkA.elements[12], 0) && approx(trunkB.elements[12], 5),
);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
