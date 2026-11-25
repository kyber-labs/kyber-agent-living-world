// Uji logika murni Phase 9 — redesain tampilan kampung.
// Dijalankan lewat bundle rolldown (lihat scripts/run-all-tests.sh;
// `node scripts/phase9-test.ts` langsung gagal karena import tanpa
// ekstensi gaya Vite — bukan cacat).
// Yang diuji: geometri atap pelana baru (ukuran alas/tinggi), palet atap
// hangat, spesifikasi menara kantor pusat baru, posisi kamera Overview
// baru (satu sumber kebenaran), suasana hangat (langit Pagi/Siang +
// jam awal 15:00). Bukan uji UI/browser; tampilan visual diverifikasi
// live oleh parent (bandingkan dengan gambar konsep).
import * as THREE from 'three';
import { environmentTargets } from '../src/simulation/environment.ts';
import { LifeSim, DAY_START_MINUTES, periodOf } from '../src/simulation/lifeSim.ts';
import { OVERVIEW_POS, OVERVIEW_TARGET } from '../src/world/camera/CameraDirector.ts';
import { gableRoofMesh, HQ_TOWER_SPEC, WARM_ROOF_COLORS } from '../src/world/buildings/city.ts';

// Stub localStorage — LifeSim memuat simpanan lokal di konstruktor.
(globalThis as Record<string, unknown>).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
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

function roofSize(w: number, d: number, h: number): { x: number; y: number; z: number } {
  const roof = gableRoofMesh(w, d, h, WARM_ROOF_COLORS.brick);
  roof.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(roof);
  const size = new THREE.Vector3();
  bb.getSize(size);
  return { x: size.x, y: size.y, z: size.z };
}

function near(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) <= eps;
}

// ---------- 1. Atap pelana: ukuran sesuai permintaan ----------
console.log('== 9: atap pelana ==');
const school = roofSize(12, 7.8, 2.4);
check('atap sekolah 12 x 2,4 x 7,8', near(school.x, 12) && near(school.y, 2.4) && near(school.z, 7.8), JSON.stringify(school));
const square = roofSize(5, 5, 2);
check('atap persegi 5 x 2 x 5', near(square.x, 5) && near(square.y, 2) && near(square.z, 5), JSON.stringify(square));
const stop = roofSize(3.4, 2.0, 0.9);
check('atap halte 3,4 x 0,9 x 2,0', near(stop.x, 3.4) && near(stop.y, 0.9) && near(stop.z, 2.0), JSON.stringify(stop));
check('atap pelana melempar bayangan', gableRoofMesh(6, 5, 2, WARM_ROOF_COLORS.teal).castShadow === true);

// ---------- 2. Palet atap hangat ----------
console.log('== 9: palet atap hangat ==');
const warm = Object.values(WARM_ROOF_COLORS);
check('palet berisi 4 warna', warm.length === 4, `dapat ${warm.length}`);
check(
  'semua warna jenuh (selisih kanal maks-min > 40), bukan abu gelap',
  warm.every((c) => {
    const r = (c >> 16) & 0xff;
    const g = (c >> 8) & 0xff;
    const b = c & 0xff;
    return Math.max(r, g, b) - Math.min(r, g, b) > 40;
  }),
  warm.map((c) => `0x${c.toString(16)}`).join(', '),
);
check(
  'tidak ada pelat gelap lama (0x334155 / 0x64748b)',
  warm.every((c) => c !== 0x334155 && c !== 0x64748b),
);

// ---------- 3. Menara kantor pusat baru ----------
console.log('== 9: menara kantor pusat ==');
check('posisi tetap (0, -22)', HQ_TOWER_SPEC.x === 0 && HQ_TOWER_SPEC.z === -22);
check('lebih ramping dari balok lama (8x8 < 16x10)', HQ_TOWER_SPEC.w === 8 && HQ_TOWER_SPEC.d === 8);
check('lebih pendek dari balok lama (13 < 18)', HQ_TOWER_SPEC.bodyHeight === 13);
check('kaca biru muda (0x7dd3fc)', HQ_TOWER_SPEC.glassColor === 0x7dd3fc);

// ---------- 4. Kamera Overview baru ----------
console.log('== 9: kamera Overview ==');
check('home (0, 63.8, 84.8) — 9.2', OVERVIEW_POS.x === 0 && OVERVIEW_POS.y === 63.8 && OVERVIEW_POS.z === 84.8);
check(
  'elevasi ~39° (9.2: sedikit lebih landai dari 42° agar puncak menara masuk frame)',
  (() => {
    const e =
      Math.atan2(OVERVIEW_POS.y - OVERVIEW_TARGET.y, OVERVIEW_POS.z - OVERVIEW_TARGET.z) * (180 / Math.PI);
    return e >= 38.5 && e <= 40;
  })(),
);
check(
  'jarak home ke target < maxDistance 110 (tidak dijepit OrbitControls)',
  Math.hypot(OVERVIEW_POS.y - OVERVIEW_TARGET.y, OVERVIEW_POS.z) < 110,
);
check('target (0, 7, 15) — 9.2', OVERVIEW_TARGET.x === 0 && OVERVIEW_TARGET.y === 7 && OVERVIEW_TARGET.z === 15);

// ---------- 5. Suasana hangat ----------
console.log('== 9: suasana hangat ==');
check('langit Siang dihangatkan (0xbcd9e6)', environmentTargets('siang', 'cerah').sky.getHex() === 0xbcd9e6);
check('matahari Siang lebih kuning emas 9.1 (0xffe9b0)', environmentTargets('siang', 'cerah').sunColor.getHex() === 0xffe9b0);
check('langit Pagi dihangatkan (0xccd9e4)', environmentTargets('pagi', 'cerah').sky.getHex() === 0xccd9e4);
check('langit Sore tetap jingga (0xe8894f)', environmentTargets('sore', 'cerah').sky.getHex() === 0xe8894f);
check('langit Malam tetap (0x232f45)', environmentTargets('malam', 'cerah').sky.getHex() === 0x232f45);
check('hujan tetap menimpa langit (0x7d8ea3)', environmentTargets('sore', 'hujan').sky.getHex() === 0x7d8ea3);
check('jam awal 15:00 (900 menit)', DAY_START_MINUTES === 900);
check('jam awal masuk periode Sore', periodOf(DAY_START_MINUTES) === 'sore');
const sim = new LifeSim(['aria']);
check(
  'LifeSim baru mulai 15:00 periode Sore',
  sim.getEnvironment().minutesOfDay === 900 && sim.getEnvironment().period === 'sore',
);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
