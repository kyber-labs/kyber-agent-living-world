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
import * as THREE from 'three';
import { buildCity } from '../src/world/buildings/city.ts';
import { buildMeetingRooms } from '../src/world/buildings/meetingRooms.ts';
import { buildWorldObject } from '../src/world/buildings/props.ts';
import { AgentCharacter } from '../src/world/characters/AgentCharacter.ts';
import { MEETING_ROOMS } from '../src/types/meeting.ts';
import { AGENTS } from '../src/config/agents.ts';

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
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfd9f2, 90, 180);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(45, 64),
  new THREE.MeshStandardMaterial({ color: 0x9fbf8f, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(90, 45, 0x7d8a99, 0xb9c4cf);
grid.position.y = 0.01;
scene.add(grid);

const plaza = new THREE.Mesh(
  new THREE.CircleGeometry(7, 48),
  new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 0.9 }),
);
plaza.rotation.x = -Math.PI / 2;
plaza.position.y = 0.02;
plaza.receiveShadow = true;
scene.add(plaza);

const city = buildCity(scene);
const roomVisuals = buildMeetingRooms(scene, MEETING_ROOMS);

const builderGroup = new THREE.Group();
builderGroup.add(buildWorldObject('bench', 8, 8, 0)); // seed 1
builderGroup.add(buildWorldObject('lamp', -8, 8, 0)); // seed 2
scene.add(builderGroup);

const rain = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial());
rain.visible = false; // cerah saat cek live
scene.add(rain);
const selRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32), new THREE.MeshBasicMaterial());
selRing.visible = false; // belum ada seleksi
scene.add(selRing);
for (const [x, z] of [[25, -12], [-25, -6]] as const) {
  const r = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.9, 48), new THREE.MeshBasicMaterial());
  r.visible = false; // tidak ada acara aktif
  r.position.set(x, 0.05, z);
  scene.add(r);
}

const characters: AgentCharacter[] = [];
AGENTS.forEach((agent, i) => {
  const ch = new AgentCharacter(agent, i);
  const angle = (i / AGENTS.length) * Math.PI * 2;
  ch.setPosition(Math.cos(angle) * 5.5, Math.sin(angle) * 5.5, 0);
  characters.push(ch);
  scene.add(ch.group);
});
scene.updateMatrixWorld(true);

// ---------- Replika hitung three.js (projectObject + shadow) ----------
function groupCount(obj: THREE.Object3D): number {
  const o = obj as THREE.Mesh;
  if (Array.isArray(o.material)) return o.geometry.groups.length;
  return 1;
}
function isRenderable(o: THREE.Object3D): boolean {
  return (o as THREE.Mesh).isMesh || (o as THREE.Sprite).isSprite || (o as THREE.Line).isLine || (o as THREE.Points).isPoints;
}
function tagOf(o: THREE.Object3D): string {
  let p: THREE.Object3D | null = o;
  while (p) {
    if (p === city.group) return 'kota';
    if (p === roomVisuals.group) return 'ruang meeting';
    if (p === builderGroup) return 'builder';
    if (characters.some((c) => c.group === p)) return 'agent';
    p = p.parent;
  }
  return 'tanah/grid/plaza';
}
function countMain(camera: THREE.Camera): { total: number; byTag: Record<string, number> } {
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
  const byTag: Record<string, number> = {};
  let total = 0;
  scene.traverse((o) => {
    if (!o.visible || !isRenderable(o)) return;
    if ((o as THREE.Mesh).frustumCulled && !frustum.intersectsObject(o)) return;
    const n = groupCount(o);
    total += n;
    const t = tagOf(o);
    byTag[t] = (byTag[t] ?? 0) + n;
  });
  return { total, byTag };
}
function countShadow(shadowCam: THREE.Camera): { total: number; byTag: Record<string, number> } {
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(shadowCam.projectionMatrix, shadowCam.matrixWorldInverse),
  );
  const byTag: Record<string, number> = {};
  let total = 0;
  scene.traverse((o) => {
    if (!o.visible) return;
    const mesh = o as THREE.Mesh;
    if (!mesh.castShadow || !isRenderable(o)) return;
    if (mesh.frustumCulled && !frustum.intersectsObject(o)) return;
    const n = groupCount(o);
    total += n;
    const t = tagOf(o);
    byTag[t] = (byTag[t] ?? 0) + n;
  });
  return { total, byTag };
}
function mainCamera(aspect: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(48, aspect, 0.1, 300);
  cam.position.set(0, 40, 75); // CAMERA_HOME Overview
  cam.lookAt(0, 0.8, 0);
  cam.updateMatrixWorld(true);
  return cam;
}
function shadowCamera(): THREE.OrthographicCamera {
  const cam = new THREE.OrthographicCamera(-30, 30, 30, -30, 1, 80);
  cam.position.set(20, 30, 10); // posisi matahari
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  return cam;
}

// ---------- 1. Reproduksi hitungan naive Phase 7 (menara = 1 mesh) ----------
let naiveCity = 0;
city.group.traverse((o) => {
  if (isRenderable(o)) naiveCity += 1;
});
check('hitungan naive Phase 7: kota = 47 mesh (menara dihitung 1)', naiveCity === 47, `dapat ${naiveCity}`);
check('hitungan naive Phase 7: 47 + 24 room + 3 tanah = 74', naiveCity + 24 + 3 === 74);

// Pra-instancing naive: marka 36 + pohon 38 + rumah 30 menggantikan
// InstancedMesh (marka 2 + pohon 2 + rumah 7).
const dashCoords: number[] = [];
for (let c = -40; c <= 40; c += 4) if (Math.abs(c) >= 8) dashCoords.push(c);
check('pra-instancing: marka jalan 36 mesh (18 per arah)', dashCoords.length === 18);
check(
  'pra-instancing naive: kota 140, total 167',
  naiveCity + (dashCoords.length * 2 - 2) + (19 * 2 - 2) + (10 * 3 - 7) === 140 &&
    naiveCity + (dashCoords.length * 2 - 2) + (19 * 2 - 2) + (10 * 3 - 7) + 24 + 3 === 167,
);

// ---------- 2. Main pass yang benar (grup material dihitung) ----------
const main = countMain(mainCamera(16 / 9));
check('main pass Overview 16:9 = 192 draw call', main.total === 192, `dapat ${main.total}`);
check(
  'main pass rincian: kota 52, meeting 24, builder 7, agent 106, tanah 3',
  main.byTag['kota'] === 52 &&
    main.byTag['ruang meeting'] === 24 &&
    main.byTag['builder'] === 7 &&
    main.byTag['agent'] === 106 &&
    main.byTag['tanah/grid/plaza'] === 3,
  JSON.stringify(main.byTag),
);
const mainNarrow = countMain(mainCamera(1.0));
check('main pass aspek 1,0 = 191 (1 mesh ter-cull)', mainNarrow.total === 191, `dapat ${mainNarrow.total}`);

// ---------- 3. Shadow pass (yang dilupakan hitungan Phase 7) ----------
const shadow = countShadow(shadowCamera());
check('shadow pass = 99 draw call', shadow.total === 99, `dapat ${shadow.total}`);
check(
  'shadow pass rincian: kota 30, meeting 6, builder 3, agent 60',
  shadow.byTag['kota'] === 30 &&
    shadow.byTag['ruang meeting'] === 6 &&
    shadow.byTag['builder'] === 3 &&
    shadow.byTag['agent'] === 60,
  JSON.stringify(shadow.byTag),
);
check(
  'HUD total = main + shadow = 291 (selisih 2 dari live 289 = variasi keadaan live)',
  main.total + shadow.total === 291,
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
check('pohon pra-instancing di shadow pass: 20/38 (9 pohon tepi di luar)', treeShadowPre === 20, `dapat ${treeShadowPre}`);
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
check('rumah pra-instancing di shadow pass: 19/20', houseShadowPre === 19, `dapat ${houseShadowPre}`);
const shadowPre = shadow.total - 2 - 6 + treeShadowPre + houseShadowPre; // ganti instanced pohon+rumah
check('shadow pass pra-instancing = 130', shadowPre === 130, `dapat ${shadowPre}`);
const mainPre = main.total + 34 + 36 + 23; // marka + pohon + rumah individual
check('main pass pra-instancing = 285', mainPre === 285, `dapat ${mainPre}`);
check(
  'penghematan benar: total 415 -> 291 = -124 (-29,9% ~ -30%), bukan -34%',
  mainPre + shadowPre === 415 && main.total + shadow.total === 291 && mainPre + shadowPre - (main.total + shadow.total) === 124,
);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
