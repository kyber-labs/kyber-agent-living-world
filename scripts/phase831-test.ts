// Uji logika murni Perbaikan 8.3.1 — label bertumpuk + pil Mode bangun.
// Dijalankan lewat bundle rolldown (lihat scripts/run-all-tests.sh;
// `node scripts/phase831-test.ts` langsung gagal karena import tanpa
// ekstensi gaya Vite — bukan cacat).
// Yang diuji: skala label dari jarak kamera (kecil saat dekat, penuh saat
// jauh) dan offset vertikal gerombolan (deterministik, tak bertumpuk
// menurut proksi jarak dunia). Bukan uji UI/browser; tampilan visual
// (banner di bawah pill, label ruangan sembunyi di mode dekat, label
// agent di layar) diverifikasi live oleh parent.
import {
  LABEL_BASE_HEIGHT,
  LABEL_BASE_WIDTH,
  LABEL_BASE_Y,
  LABEL_CLUSTER_DISTANCE,
  LABEL_STACK_STEP,
  computeLabelOffsets,
  labelScaleForDistance,
} from '../src/simulation/labelLayout.ts';

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

// ---------- 1. Konstanta label (konsisten dengan Phase 3) ----------
console.log('== 8.3.1: konstanta label ==');
check('lebar dasar label 2,2 (Phase 3)', near(LABEL_BASE_WIDTH, 2.2));
check('tinggi dasar label 0,83 (Phase 3)', near(LABEL_BASE_HEIGHT, 0.83));
check('label di y 2,05 (Phase 3)', near(LABEL_BASE_Y, 2.05));
check('jarak gerombolan = lebar label (2,2)', near(LABEL_CLUSTER_DISTANCE, LABEL_BASE_WIDTH));
check('langkah tumpuk = tinggi label (0,85 ~ 0,83, dibulatkan ke atas)', LABEL_STACK_STEP >= LABEL_BASE_HEIGHT, `langkah ${LABEL_STACK_STEP} vs tinggi ${LABEL_BASE_HEIGHT}`);

// ---------- 2. Skala label dari jarak kamera ----------
console.log('== 8.3.1: skala label dari jarak ==');
check('jarak 0 -> skala minimum 0,3', near(labelScaleForDistance(0), 0.3));
check('jarak 1,5 (sangat dekat) -> 0,3', near(labelScaleForDistance(1.5), 0.3));
check('jarak 3,6 (batas bawah) -> 0,3', near(labelScaleForDistance(3.6), 0.3));
check('jarak 6 -> 0,5', near(labelScaleForDistance(6), 0.5));
check('jarak 7,8 (mode Ikuti Agent) -> 0,65', near(labelScaleForDistance(7.8), 0.65), `dapat ${labelScaleForDistance(7.8)}`);
check('jarak 12 (batas atas) -> 1', near(labelScaleForDistance(12), 1));
check('jarak 44 (mode Atas) -> 1', near(labelScaleForDistance(44), 1));
check('jarak 85 (Overview) -> 1', near(labelScaleForDistance(85), 1));
check('skala monoton naik terhadap jarak', labelScaleForDistance(2) <= labelScaleForDistance(5) && labelScaleForDistance(5) <= labelScaleForDistance(9) && labelScaleForDistance(9) <= labelScaleForDistance(20));
check('skala tak pernah di bawah 0,3 atau di atas 1', labelScaleForDistance(-5) === 0.3 && labelScaleForDistance(1000) === 1);
// Ukuran tampak: pada rentang 3,6–12 skala/jarak konstan (1/12) —
// label tampak sama besarnya dari jarak berapa pun di rentang itu.
check('ukuran tampak konstan di 3,6–12 (skala/jarak = 1/12)', near(labelScaleForDistance(6) / 6, 1 / 12) && near(labelScaleForDistance(9) / 9, 1 / 12));
// Label dekat 0,3× di jarak 1,5 unit tampak setara label penuh di ~5
// unit — terbaca, bukan memenuhi layar (dulu 0,83/1,34 ≈ 62% tinggi layar).
check('label dekat tampak ~seperti label penuh di 5 unit', near(0.3 / 1.5, 1 / 5, 0.01));

// ---------- 3. Offset vertikal gerombolan ----------
console.log('== 8.3.1: offset gerombolan ==');
check('tanpa agent -> []', computeLabelOffsets([]).length === 0);
check('satu agent -> [0]', JSON.stringify(computeLabelOffsets([{ x: 0, z: 0 }])) === '[0]');
check('dua agent berjauhan -> [0, 0]', JSON.stringify(computeLabelOffsets([{ x: 0, z: 0 }, { x: 10, z: 10 }])) === '[0,0]');
check('dua agent berdekatan (1 unit) -> [0, 0.85]', JSON.stringify(computeLabelOffsets([{ x: 0, z: 0 }, { x: 1, z: 0 }])) === '[0,0.85]');
check('tiga agent bergerombol -> [0, 0.85, 1.7]', JSON.stringify(computeLabelOffsets([{ x: 0, z: 0 }, { x: 0.5, z: 0.5 }, { x: -0.5, z: 0.5 }])) === '[0,0.85,1.7]');
check('rantai A-B dekat, B-C dekat, A-C jauh -> [0, 0.85, 0] (C jauh dari A, boleh tingkat 0)', JSON.stringify(computeLabelOffsets([{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 4, z: 0 }])) === '[0,0.85,0]');
check('tepat di ambang 2,2 -> bukan gerombolan', JSON.stringify(computeLabelOffsets([{ x: 0, z: 0 }, { x: 2.2, z: 0 }])) === '[0,0]');
check('dua gerombolan terpisah -> [0, 0.85, 0, 0.85]', JSON.stringify(computeLabelOffsets([{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 20, z: 0 }, { x: 21, z: 0 }])) === '[0,0.85,0,0.85]');
check('urutan roster menentukan (bukan posisi): agent pertama selalu 0', computeLabelOffsets([{ x: 5, z: 5 }, { x: 5.5, z: 5 }])[0] === 0);
check('deterministik: dua kali hitung hasilnya sama', JSON.stringify(computeLabelOffsets([{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 0, z: 1 }])) === JSON.stringify(computeLabelOffsets([{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 0, z: 1 }])));
// Jaminan tak bertumpuk (menurut proksi): label dalam satu gerombolan
// berjarak vertikal tepat satu tinggi label penuh.
const offsets = computeLabelOffsets([{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 0, z: 1 }]);
check('selisih offset antar label segelombolan >= tinggi label', offsets[1] - offsets[0] >= LABEL_BASE_HEIGHT && offsets[2] - offsets[1] >= LABEL_BASE_HEIGHT);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
