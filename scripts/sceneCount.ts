// Replika hitung draw call — dipakai scripts/phase71-test.ts dan
// scripts/phase82-test.ts. Membangun scene persis seperti createWorld
// (statis + agent) lalu menghitung main pass + shadow pass dengan
// matematika frustum three.js yang sama seperti renderer (lihat
// penyelidikan 7.1): HUD = main + shadow, tiap grup material dihitung.
// Bukan uji UI/browser; FPS live tidak diuji di sini.
import * as THREE from 'three';
import { buildCity, type CityInfo } from '../src/world/buildings/city.ts';
import { buildMeetingRooms, type RoomVisuals } from '../src/world/buildings/meetingRooms.ts';
import { buildWorldObject } from '../src/world/buildings/props.ts';
import { AgentCharacter } from '../src/world/characters/AgentCharacter.ts';
import { Animals } from '../src/world/animals/Animals.ts';
import { MEETING_ROOMS } from '../src/types/meeting.ts';
import { AGENTS } from '../src/config/agents.ts';

export interface ReplicaScene {
  scene: THREE.Scene;
  city: { group: THREE.Group; info: CityInfo };
  roomVisuals: RoomVisuals;
  builderGroup: THREE.Group;
  characters: AgentCharacter[];
  animals: Animals | null;
}

/** Bangun scene persis seperti createWorld (tanah/grid/plaza, kota,
 *  ruang meeting, objek builder seed, hujan, cincin, agent). Hewan
 *  hanya bila withAnimals (8.2) — matriks awal sudah ditulis konstruktor. */
export function buildReplicaScene(withAnimals = false): ReplicaScene {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfd9f2, 90, 180);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(45, 64),
    new THREE.MeshStandardMaterial({ color: 0x9fbf8f, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Phase 9: cincin pasir tepi pulau — seperti createWorld.
  const sandRim = new THREE.Mesh(
    new THREE.RingGeometry(45, 48.5, 64),
    new THREE.MeshStandardMaterial({ color: 0xe7d3a1, roughness: 1 }),
  );
  sandRim.rotation.x = -Math.PI / 2;
  sandRim.position.y = 0.005;
  sandRim.receiveShadow = true;
  scene.add(sandRim);

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

  const animals = withAnimals ? new Animals(scene) : null;
  scene.updateMatrixWorld(true);
  return { scene, city, roomVisuals, builderGroup, characters, animals };
}

export function groupCount(obj: THREE.Object3D): number {
  const o = obj as THREE.Mesh;
  if (Array.isArray(o.material)) return o.geometry.groups.length;
  return 1;
}

export function isRenderable(o: THREE.Object3D): boolean {
  return (o as THREE.Mesh).isMesh || (o as THREE.Sprite).isSprite || (o as THREE.Line).isLine || (o as THREE.Points).isPoints;
}

export function tagOf(replica: ReplicaScene, o: THREE.Object3D): string {
  let p: THREE.Object3D | null = o;
  while (p) {
    if (p === replica.city.group) return 'kota';
    if (p === replica.roomVisuals.group) return 'ruang meeting';
    if (p === replica.builderGroup) return 'builder';
    if (replica.animals && p === replica.animals.group) return 'hewan';
    if (replica.characters.some((c) => c.group === p)) return 'agent';
    p = p.parent;
  }
  return 'tanah/grid/plaza';
}

export function countMain(replica: ReplicaScene, camera: THREE.Camera): { total: number; byTag: Record<string, number> } {
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
  const byTag: Record<string, number> = {};
  let total = 0;
  replica.scene.traverse((o) => {
    if (!o.visible || !isRenderable(o)) return;
    if ((o as THREE.Mesh).frustumCulled && !frustum.intersectsObject(o)) return;
    const n = groupCount(o);
    total += n;
    const t = tagOf(replica, o);
    byTag[t] = (byTag[t] ?? 0) + n;
  });
  return { total, byTag };
}

export function countShadow(replica: ReplicaScene, shadowCam: THREE.Camera): { total: number; byTag: Record<string, number> } {
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(shadowCam.projectionMatrix, shadowCam.matrixWorldInverse),
  );
  const byTag: Record<string, number> = {};
  let total = 0;
  replica.scene.traverse((o) => {
    if (!o.visible) return;
    const mesh = o as THREE.Mesh;
    if (!mesh.castShadow || !isRenderable(o)) return;
    if (mesh.frustumCulled && !frustum.intersectsObject(o)) return;
    const n = groupCount(o);
    total += n;
    const t = tagOf(replica, o);
    byTag[t] = (byTag[t] ?? 0) + n;
  });
  return { total, byTag };
}

export function overviewCamera(aspect: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(48, aspect, 0.1, 300);
  cam.position.set(0, 55, 60); // Phase 9: OVERVIEW_POS Overview (dulu (0,40,75)).
  cam.lookAt(0, 0.8, 0);
  cam.updateMatrixWorld(true);
  return cam;
}

export function shadowCamera(): THREE.OrthographicCamera {
  const cam = new THREE.OrthographicCamera(-30, 30, 30, -30, 1, 80);
  cam.position.set(20, 30, 10); // posisi matahari
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  return cam;
}
