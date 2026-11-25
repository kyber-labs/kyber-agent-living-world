// Uji logika murni Phase 9.2 — bingkai kamera mencakup bangunan tinggi.
// Dijalankan lewat bundle rolldown (lihat scripts/run-all-tests.sh;
// `node scripts/phase92-test.ts` langsung gagal karena import tanpa
// ekstensi gaya Vite — bukan cacat).
// PELAJARAN 9.1 (jangan diulangi): uji 9.1 hanya mengunci lingkaran tanah
// r 48,5 di y=0 — padahal yang terpotong live adalah PUNCAK bangunan
// (ujung antena menara distrik di NDC y 1,09; antena HQ menyentuh pil;
// masjid terpotong di tepi kiri pada viewport yang lebih sempit dari
// 16:9). Uji ini memproyeksikan titik jangkar 3D NYATA lewat
// PerspectiveCamera three.js (FOV 48°) dari OVERVIEW_POS/OVERVIEW_TARGET.
// Dimensi jangkar dibaca dari kode sumber (bukan angka karangan):
// - HQ: HQ_TOWER_SPEC (city.ts) — badan 13 + mahkota Cone(5.6,2.2)
//   center y 14,1 -> puncak 15,2; antena Cylinder h=2,6 center y 16,4
//   -> ujung 17,7. Dihitung dari spec, bukan hardcode.
// - Menara distrik: district.ts buildTower — grup (36,0,-34); badan
//   Box(7,20,7) center y=10 -> atas 20; mahkota Cone(5.6,2.0) center
//   y=21 -> puncak 22; antena Cylinder h=3 center y=22 -> ujung 23,5.
// - Masjid: district.ts buildMosque — grup (-36,0,33); kubah Sphere
//   r=2,2 center y=4 -> atas 6,2; finial Cylinder h=0,9 center y=6,4
//   -> ujung 6,85; menara Cylinder h=9 center y=4,5 di lokal
//   (-3,2,-2,2) -> dunia (-39,2,30,8), atas 9,0; kerucut Cone(0,55,1,3)
//   center y=9,6 -> ujung 10,25. Sudut barat: footprint w=8 -> x -40.
// Bukan uji UI/browser; tampilan visual diverifikasi live oleh parent.
import * as THREE from 'three';
import { OVERVIEW_POS, OVERVIEW_TARGET } from '../src/world/camera/CameraDirector.ts';
import { HQ_TOWER_SPEC } from '../src/world/buildings/city.ts';

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

interface Anchor {
  name: string;
  p: THREE.Vector3;
  /** Batas atas NDC y (0,85 untuk ujung antena — ambang pil kamera). */
  maxY: number;
}

const hqAntennaTipY = HQ_TOWER_SPEC.bodyHeight + 3.4 + 2.6 / 2; // 17,7
const hqCrownTopY = HQ_TOWER_SPEC.bodyHeight + 1.1 + 2.2 / 2; // 15,2
const anchors: Anchor[] = [
  { name: 'menara distrik ujung antena', p: new THREE.Vector3(36, 23.5, -34), maxY: 0.85 },
  { name: 'menara distrik puncak mahkota', p: new THREE.Vector3(36, 22, -34), maxY: 0.93 },
  { name: 'menara distrik atas badan', p: new THREE.Vector3(36, 20, -34), maxY: 0.93 },
  { name: 'HQ ujung antena', p: new THREE.Vector3(HQ_TOWER_SPEC.x, hqAntennaTipY, HQ_TOWER_SPEC.z), maxY: 0.85 },
  { name: 'HQ puncak mahkota', p: new THREE.Vector3(HQ_TOWER_SPEC.x, hqCrownTopY, HQ_TOWER_SPEC.z), maxY: 0.93 },
  { name: 'masjid ujung menara', p: new THREE.Vector3(-39.2, 10.25, 30.8), maxY: 0.93 },
  { name: 'masjid finial kubah', p: new THREE.Vector3(-36, 6.85, 33), maxY: 0.93 },
  { name: 'masjid sudut barat', p: new THREE.Vector3(-40, 4, 33), maxY: 0.93 },
];

function project(camPos: THREE.Vector3, target: THREE.Vector3, point: THREE.Vector3, aspect = 16 / 9): { x: number; y: number } {
  const cam = new THREE.PerspectiveCamera(48, aspect, 0.1, 300);
  cam.position.copy(camPos);
  cam.lookAt(target);
  cam.updateMatrixWorld(true);
  const v = point.clone().project(cam);
  return { x: v.x, y: v.y };
}

/** |NDC| terbesar lingkaran tanah r 48,5 + NDC y tepi selatan. */
function groundFrame(camPos: THREE.Vector3, target: THREE.Vector3, aspect = 16 / 9): { max: number; southY: number } {
  let m = 0;
  let southY = 0;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const p = new THREE.Vector3(48.5 * Math.cos(a), 0, 48.5 * Math.sin(a));
    const r = project(camPos, target, p, aspect);
    m = Math.max(m, Math.abs(r.x), Math.abs(r.y));
    if (Math.abs(a - Math.PI / 2) < 0.01) southY = r.y;
  }
  return { max: m, southY };
}

const homeDist = OVERVIEW_POS.distanceTo(OVERVIEW_TARGET);
const elevation = (Math.atan2(OVERVIEW_POS.y - OVERVIEW_TARGET.y, OVERVIEW_POS.z - OVERVIEW_TARGET.z) * 180) / Math.PI;
const ground = groundFrame(OVERVIEW_POS, OVERVIEW_TARGET);
const ndc = (a: Anchor): { x: number; y: number } => project(OVERVIEW_POS, OVERVIEW_TARGET, a.p);
const districtTip = ndc(anchors[0]);
const hqTip = ndc(anchors[3]);
const mosqueMinaret = ndc(anchors[5]);

// ---------- 1. Konstanta kamera baru ----------
console.log('== 9.2: kamera Overview baru ==');
check('home (0, 63.8, 84.8)', OVERVIEW_POS.x === 0 && OVERVIEW_POS.y === 63.8 && OVERVIEW_POS.z === 84.8);
check('target (0, 7, 15)', OVERVIEW_TARGET.x === 0 && OVERVIEW_TARGET.y === 7 && OVERVIEW_TARGET.z === 15);
check('jarak home ~90 (dulu ~81)', homeDist >= 89 && homeDist <= 91, `dapat ${homeDist.toFixed(1)}`);
check('jarak home < maxDistance 110', homeDist < 110, `dapat ${homeDist.toFixed(1)}`);
check('elevasi ~39° (dulu 42,1° — tilt ke atas ~3°)', elevation >= 38.5 && elevation <= 40, `dapat ${elevation.toFixed(1)}°`);
// FOV TIDAK diuji di sini (literal 48 di createWorld.ts, tidak diekspor)
// — diperiksa lewat grep + verifikasi live; 9.2 tidak mengubahnya.

// ---------- 2. Titik jangkar 3D di home 16:9 ----------
console.log('== 9.2: jangkar 3D di home 16:9 ==');
for (const a of anchors) {
  const r = ndc(a);
  check(
    `${a.name} masuk frame (|NDC| <= 0,93, y <= ${a.maxY})`,
    Math.abs(r.x) <= 0.93 && r.y <= a.maxY && r.y >= -0.93,
    `dapat (${r.x.toFixed(3)}, ${r.y.toFixed(3)})`,
  );
}
check(
  'ujung antena distrik di bawah pil (NDC y 0,80–0,85, dulu 1,09)',
  districtTip.y >= 0.8 && districtTip.y <= 0.85,
  `dapat ${districtTip.y.toFixed(3)}`,
);
check(
  'ujung antena HQ jauh di bawah pil (NDC y 0,60–0,85, dulu 0,87)',
  hqTip.y >= 0.6 && hqTip.y <= 0.85,
  `dapat ${hqTip.y.toFixed(3)}`,
);
check('menara masjid tidak terpotong kiri (|x| <= 0,70)', Math.abs(mosqueMinaret.x) <= 0.7, `dapat ${mosqueMinaret.x.toFixed(3)}`);

// ---------- 3. Tanah tetap penuh (pencapaian 9.1 dipertahankan) ----------
console.log('== 9.2: tanah tetap penuh ==');
check(
  'tanah max |NDC| 0,85–0,90 (dulu 0,916 — mengecil hanya ~5%)',
  ground.max >= 0.85 && ground.max <= 0.9,
  `dapat ${ground.max.toFixed(3)}`,
);
check(
  'tepi selatan masuk frame (NDC y -0,90 – -0,85, dulu -0,916)',
  ground.southY >= -0.9 && ground.southY <= -0.85,
  `dapat ${ground.southY.toFixed(3)}`,
);

// ---------- 4. Zoom-out mentok (maxDistance 110) ----------
console.log('== 9.2: zoom-out mentok ==');
const axis = new THREE.Vector3().subVectors(OVERVIEW_POS, OVERVIEW_TARGET).normalize();
const farPos = OVERVIEW_TARGET.clone().addScaledVector(axis, 110);
const farGround = groundFrame(farPos, OVERVIEW_TARGET);
const farTip = project(farPos, OVERVIEW_TARGET, anchors[0].p);
check('zoom-out mentok: tanah tetap masuk frame (<= 0,70)', farGround.max <= 0.7, `dapat ${farGround.max.toFixed(3)}`);
check('zoom-out mentok: ujung antena distrik masuk frame (<= 0,75)', farTip.y <= 0.75, `dapat ${farTip.y.toFixed(3)}`);
check(
  'zoom-out mentok: semua jangkar masuk frame',
  anchors.every((a) => {
    const r = project(farPos, OVERVIEW_TARGET, a.p);
    return Math.abs(r.x) <= 0.93 && Math.abs(r.y) <= 0.93;
  }),
);

// ---------- 5. Ketahanan aspek sempit (temuan live 9.1) ----------
console.log('== 9.2: aspek 4:3 (viewport lebih sempit) ==');
const mosque43 = project(OVERVIEW_POS, OVERVIEW_TARGET, anchors[5].p, 4 / 3);
check(
  'aspek 4:3: menara masjid masuk frame (dulu -1,05, terpotong)',
  Math.abs(mosque43.x) <= 0.93,
  `dapat ${mosque43.x.toFixed(3)}`,
);
const tip43 = project(OVERVIEW_POS, OVERVIEW_TARGET, anchors[0].p, 4 / 3);
check('aspek 4:3: ujung antena distrik tetap di bawah pil', tip43.y <= 0.85, `dapat ${tip43.y.toFixed(3)}`);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
