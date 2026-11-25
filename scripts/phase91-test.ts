// Uji logika murni Phase 9.1 — mendekatkan tampilan live ke gambar konsep.
// Dijalankan lewat bundle rolldown (lihat scripts/run-all-tests.sh;
// `node scripts/phase91-test.ts` langsung gagal karena import tanpa
// ekstensi gaya Vite — bukan cacat).
// Yang diuji: laut (SEA_SPEC), framing 16:9 (proyeksi three.js nyata
// dari OVERVIEW_POS/OVERVIEW_TARGET — seluruh pulau r 48,5 masuk frame
// di home DAN saat zoom-out mentok), jendela senja yang diperlebar
// (Sore 14:00–19:00), nilai pencahayaan yang lebih hangat + tegas.
// Label "Phase 9" TIDAK bisa diuji di sini (teks ada di .tsx yang
// memakai DOM/CSS) — diperiksa lewat grep + verifikasi live.
// Bukan uji UI/browser; tampilan visual diverifikasi live oleh parent.
import * as THREE from 'three';
import { environmentTargets } from '../src/simulation/environment.ts';
import { LifeSim, DAY_START_MINUTES, MINUTES_PER_REAL_SECOND, periodOf } from '../src/simulation/lifeSim.ts';
import { OVERVIEW_POS, OVERVIEW_TARGET } from '../src/world/camera/CameraDirector.ts';
import { SEA_SPEC } from '../src/world/engine/createWorld.ts';

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

/** |NDC| terbesar dari lingkaran pulau (r 48,5) lewat kamera three.js nyata. */
function maxNdc(camPos: THREE.Vector3, target: THREE.Vector3, aspect: number): { max: number; southY: number; northY: number } {
  const cam = new THREE.PerspectiveCamera(48, aspect, 0.1, 300);
  cam.position.copy(camPos);
  cam.lookAt(target);
  cam.updateMatrixWorld(true);
  let m = 0;
  let southY = 0;
  let northY = 0;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const p = new THREE.Vector3(48.5 * Math.cos(a), 0, 48.5 * Math.sin(a));
    p.project(cam);
    m = Math.max(m, Math.abs(p.x), Math.abs(p.y));
    if (Math.abs(a - Math.PI / 2) < 0.01) southY = p.y; // +z = selatan
    if (Math.abs(a - (3 * Math.PI) / 2) < 0.01) northY = p.y; // -z = utara
  }
  return { max: m, southY, northY };
}

// ---------- 1. Laut ----------
console.log('== 9.1: laut ==');
check('radius 200', SEA_SPEC.radius === 200, `dapat ${SEA_SPEC.radius}`);
check(
  'radius melewati fog far 180 (tepi memudar ke kabut)',
  SEA_SPEC.radius > 180,
  `dapat ${SEA_SPEC.radius}`,
);
check('di bawah tanah (y -0,05, tanpa z-fighting)', SEA_SPEC.y === -0.05 && SEA_SPEC.y < 0, `dapat ${SEA_SPEC.y}`);
check(
  'biru laut (kanal biru paling besar)',
  ((SEA_SPEC.color >> 16) & 0xff) < ((SEA_SPEC.color >> 8) & 0xff) &&
    ((SEA_SPEC.color >> 8) & 0xff) < (SEA_SPEC.color & 0xff),
  `dapat 0x${SEA_SPEC.color.toString(16)}`,
);
check(
  'opacity 0,91–0,99 (tidak pernah tembus pandang penuh / buram penuh)',
  SEA_SPEC.opacityBase - SEA_SPEC.opacityAmp >= 0.9 && SEA_SPEC.opacityBase + SEA_SPEC.opacityAmp <= 1,
  `dapat ${SEA_SPEC.opacityBase} ± ${SEA_SPEC.opacityAmp}`,
);
check(
  'denyut sangat pelan (periode >= 20 dtk)',
  SEA_SPEC.pulsePeriodSeconds >= 20,
  `dapat ${SEA_SPEC.pulsePeriodSeconds} dtk`,
);

// ---------- 2. Bingkai penuh 16:9 ----------
console.log('== 9.1: bingkai penuh ==');
const homeDist = OVERVIEW_POS.distanceTo(OVERVIEW_TARGET);
check('jarak home ~81 < maxDistance 95 (tidak dijepit OrbitControls)', homeDist < 95, `dapat ${homeDist.toFixed(1)}`);
const home = maxNdc(OVERVIEW_POS, OVERVIEW_TARGET, 16 / 9);
check('home 16:9: seluruh pulau masuk frame (max |NDC| <= 0,93)', home.max <= 0.93, `dapat ${home.max.toFixed(3)}`);
check('home 16:9: tepi selatan masuk frame (y >= -0,93)', home.southY >= -0.93, `dapat ${home.southY.toFixed(3)}`);
check('home 16:9: tepi utara masuk frame (y <= 0,93)', home.northY <= 0.93, `dapat ${home.northY.toFixed(3)}`);
// Zoom-out mentok: kamera menjauh sepanjang sinar target -> posisi home
// sampai jarak 95 (maxDistance di createWorld.ts).
const k = 95 / homeDist;
const farPos = new THREE.Vector3().copy(OVERVIEW_TARGET).addScaledVector(new THREE.Vector3().subVectors(OVERVIEW_POS, OVERVIEW_TARGET), k);
const far = maxNdc(farPos, OVERVIEW_TARGET, 16 / 9);
check('zoom-out mentok: seluruh pulau tetap masuk frame (max |NDC| <= 0,93)', far.max <= 0.93, `dapat ${far.max.toFixed(3)}`);

// ---------- 3. Senja lebih lama ----------
console.log('== 9.1: senja lebih lama ==');
check('14:00 = sore (awal jendela baru)', periodOf(840) === 'sore');
check('13:59 masih siang (batas bawah)', periodOf(839) === 'siang');
check('15:00 = sore (jam awal tetap senja)', periodOf(900) === 'sore');
check('17:00 = sore', periodOf(1020) === 'sore');
check('18:59 = sore (akhir jendela baru)', periodOf(1139) === 'sore');
check('19:00 = malam (batas atas)', periodOf(1140) === 'malam');
check(
  'jendela sore 5 jam = ~125 dtk nyata (dulu 3 jam = ~75 dtk)',
  (1140 - 840) / MINUTES_PER_REAL_SECOND >= 120,
  `dapat ${((1140 - 840) / MINUTES_PER_REAL_SECOND).toFixed(0)} dtk`,
);
check('jam awal tetap 15:00 (900)', DAY_START_MINUTES === 900);
const sim = new LifeSim(['aria']);
check(
  'LifeSim baru mulai 15:00 periode Sore',
  sim.getEnvironment().minutesOfDay === 900 && sim.getEnvironment().period === 'sore',
);

// ---------- 4. Pencahayaan lebih kaya ----------
console.log('== 9.1: pencahayaan lebih kaya ==');
const siang = environmentTargets('siang', 'cerah');
const pagi = environmentTargets('pagi', 'cerah');
const sore = environmentTargets('sore', 'cerah');
const malam = environmentTargets('malam', 'cerah');
check('matahari Siang lebih kuat (2,2, dulu 1,9)', siang.sunIntensity === 2.2, `dapat ${siang.sunIntensity}`);
check('cahaya isi Siang ditekan (0,85, dulu 1,0)', siang.hemiIntensity === 0.85, `dapat ${siang.hemiIntensity}`);
check('matahari Pagi lebih kuat (1,8, dulu 1,6)', pagi.sunIntensity === 1.8, `dapat ${pagi.sunIntensity}`);
check('cahaya isi Pagi ditekan (0,8, dulu 0,9)', pagi.hemiIntensity === 0.8, `dapat ${pagi.hemiIntensity}`);
check('cahaya isi Sore ditekan (0,55, dulu 0,65)', sore.hemiIntensity === 0.55, `dapat ${sore.hemiIntensity}`);
check('matahari Sore tetap redup (1,1)', sore.sunIntensity === 1.1, `dapat ${sore.sunIntensity}`);
check('arah mendominasi isi di Siang (2,2 > 0,85)', siang.sunIntensity > siang.hemiIntensity);
check('Malam tetap (0,35 / 0,35)', malam.sunIntensity === 0.35 && malam.hemiIntensity === 0.35);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
