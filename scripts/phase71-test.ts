// Uji logika murni penyelidikan 7.1 — dijalankan lewat bundle rolldown
// (lihat scripts/run-all-tests.sh; `node scripts/phase71-test.ts`
// langsung gagal karena import tanpa ekstensi gaya Vite — bukan cacat).
// Mengunci temuan draw call live 289 vs ekspektasi Phase 7 "182":
// angka HUD (renderer.info.render.calls) = main pass + SHADOW pass,
// dan hitungan "182" Phase 7 adalah hitungan main-pass saja yang
// bahkan dihitung kurang (menara dihitung 1 padahal 6 grup material,
// agent ~100 padahal 106). Hitungan ulang dari scene graph ASLI
// (builder kota/meeting/props/karakter yang sama dengan aplikasi):
// main 192 + shadow 99 = 291, selisih 2 dari live 289 (variasi keadaan
// live: aspek kamera/posisi agent — Monte Carlo 20 seed: 261–291).
// Bukan uji UI/browser; FPS live tidak diuji di sini.
//
// PEMBARUAN 9.1 (25 Nov 2026): kamera Overview digeser ke selatan
// (0,55,60) -> (0,55,75) + target (0,0.8,0) -> (0,0.8,15) supaya
// seluruh pulau masuk frame; laut +1 mesh tanah; frustum bayangan
// ±30 -> ±50 (far 80 -> 120) supaya seluruh pulau berbayang.
// Angka yang dikunci berubah: main TETAP 231 (laut +1, satu mesh kota
// ter-cull dari posisi kamera baru), shadow 109 -> 121, total
// 340 -> 352 (dengan hewan 351 -> 363, lihat phase82-test.ts).
// Rincian baru ada di docs/PHASES.md §9.1.
import * as THREE from 'three';
import {
  buildReplicaScene,
  countMain,
  countShadow,
  overviewCamera,
  shadowCamera,
  isRenderable,
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

// ---------- Bangun scene persis seperti createWorld (statis + agent) ----------
// Tanpa hewan: uji ini mengunci geometri kota; hewan dihitung terpisah
// di phase82-test.ts (main +11, shadow +0).
const replica = buildReplicaScene(false);
const { city } = replica;

// ---------- 1. Reproduksi hitungan naive Phase 7 (menara = 1 mesh) ----------
// 8.2: 47 -> 91 (44 mesh kawasan baru: masjid 6, sekolah 5, klinik 5,
// toko 4, lapak pasar 4, menara kaca 3, kolam 2, taman bermain 8,
// halte 4, mobil 3). Phase 9: 91 -> 90 (menara kantor pusat 6 -> 5 mesh).
let naiveCity = 0;
city.group.traverse((o) => {
  if (isRenderable(o)) naiveCity += 1;
});
check('hitungan naive Phase 9: kota = 90 mesh (46 lama + 44 baru 8.2)', naiveCity === 90, `dapat ${naiveCity}`);
// 9.1: tanah 4 -> 5 (laut +1).
check('hitungan naive 9.1: 90 + 24 room + 5 tanah = 119', naiveCity + 24 + 5 === 119);

// Pra-instancing naive: marka 36 + pohon 38 + rumah 30 menggantikan
// InstancedMesh (marka 2 + pohon 2 + rumah 7).
const dashCoords: number[] = [];
for (let c = -40; c <= 40; c += 4) if (Math.abs(c) >= 8) dashCoords.push(c);
check('pra-instancing: marka jalan 36 mesh (18 per arah)', dashCoords.length === 18);
check(
  'pra-instancing naive: kota 183, total 212',
  naiveCity + (dashCoords.length * 2 - 2) + (19 * 2 - 2) + (10 * 3 - 7) === 183 &&
    naiveCity + (dashCoords.length * 2 - 2) + (19 * 2 - 2) + (10 * 3 - 7) + 24 + 5 === 212,
);

// ---------- 2. Main pass yang benar (grup material dihitung) ----------
const main = countMain(replica, overviewCamera(16 / 9));
check('main pass Overview 16:9 = 231 draw call', main.total === 231, `dapat ${main.total}`);
check(
  'main pass rincian: kota 89, meeting 24, builder 7, agent 106, tanah 5',
  main.byTag['kota'] === 89 &&
    main.byTag['ruang meeting'] === 24 &&
    main.byTag['builder'] === 7 &&
    main.byTag['agent'] === 106 &&
    main.byTag['tanah/grid/plaza'] === 5,
  JSON.stringify(main.byTag),
);
const mainNarrow = countMain(replica, overviewCamera(1.0));
check('main pass aspek 1,0 = 225 (6 mesh ter-cull)', mainNarrow.total === 225, `dapat ${mainNarrow.total}`);

// ---------- 3. Shadow pass (yang dilupakan hitungan Phase 7) ----------
const shadow = countShadow(replica, shadowCamera());
check('shadow pass = 121 draw call', shadow.total === 121, `dapat ${shadow.total}`);
check(
  'shadow pass rincian: kota 52, meeting 6, builder 3, agent 60',
  shadow.byTag['kota'] === 52 &&
    shadow.byTag['ruang meeting'] === 6 &&
    shadow.byTag['builder'] === 3 &&
    shadow.byTag['agent'] === 60,
  JSON.stringify(shadow.byTag),
);
check(
  'HUD total tanpa hewan = main + shadow = 352 (live +11 hewan = 363, lihat phase82)',
  main.total + shadow.total === 352,
);
check(
  'shadow pass nyata (>0) — HUD menghitung main + shadow, bukan main saja',
  shadow.total > 0 && main.total + shadow.total - main.total === shadow.total,
);

// ---------- 4. Pra-instancing yang benar (bayangan diuji per mesh) ----------
const treeSpots: [number, number, number][] = [
  [-27, 11, 1.15], [-21, 17, 1.15], [-18, 10, 1.15], [-26, 18, 1.15], [-22, 8, 1.15],
  ...([
    [34, 6], [36, 18], [30, 30], [14, 36], [-6, 38], [-24, 34], [-36, 26], [-38, 8],
    [-34, -24], [-14, -34], [8, -36], [28, -30], [38, -14], [-30, 30],
  ] as [number, number][]).map(([x, z]): [number, number, number] => [x, z, 0.9 + (((x + z) % 3) * 0.15)]),
];
const shCam = shadowCamera();
const shFrustum = new THREE.Frustum();
shFrustum.setFromProjectionMatrix(
  new THREE.Matrix4().multiplyMatrices(shCam.projectionMatrix, shCam.matrixWorldInverse),
);
let treeShadowPre = 0;
for (const [x, z, s] of treeSpots) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.9 * s, 8), new THREE.MeshStandardMaterial());
  trunk.position.set(x, 0.45 * s, z);
  trunk.updateMatrixWorld(true);
  const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 0), new THREE.MeshStandardMaterial());
  foliage.position.set(x, 1.5 * s, z);
  foliage.updateMatrixWorld(true);
  if (shFrustum.intersectsObject(trunk)) treeShadowPre += 1;
  if (shFrustum.intersectsObject(foliage)) treeShadowPre += 1;
}
check('pohon pra-instancing di shadow pass: 38/38 (semua pohon kini di dalam frustum ±50)', treeShadowPre === 38, `dapat ${treeShadowPre}`);
let houseShadowPre = 0;
for (const x of [-20, -10, 0, 10, 20]) {
  for (const z of [18, 27]) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 3.5), new THREE.MeshStandardMaterial());
    body.position.set(x, 1.3, z);
    body.updateMatrixWorld(true);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.7, 4), new THREE.MeshStandardMaterial());
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.85);
    roof.position.set(x, 3.45, z);
    roof.updateMatrixWorld(true);
    if (shFrustum.intersectsObject(body)) houseShadowPre += 1;
    if (shFrustum.intersectsObject(roof)) houseShadowPre += 1;
  }
}
check('rumah pra-instancing di shadow pass: 20/20', houseShadowPre === 20, `dapat ${houseShadowPre}`);
const shadowPre = shadow.total - 2 - 6 + treeShadowPre + houseShadowPre; // ganti instanced pohon+rumah
check('shadow pass pra-instancing = 171', shadowPre === 171, `dapat ${shadowPre}`);
const mainPre = main.total + 34 + 36 + 23; // marka + pohon + rumah individual
check('main pass pra-instancing = 324', mainPre === 324, `dapat ${mainPre}`);
check(
  'penghematan benar: total 495 -> 352 = -143 (-28,9% ~ -29%), bukan -34%',
  mainPre + shadowPre === 495 && main.total + shadow.total === 352 && mainPre + shadowPre - (main.total + shadow.total) === 143,
);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
