// Kawasan virtual — MASTER PROMPT §3.
// Phase 2: gedung kantor pusat (6 lantai), arena olahraga, area hiburan,
// residensial (10 rumah), taman, jalan, dan alam. Semua geometri nyata
// (bukan placeholder): bangunan punya dinding, jendela, atap, dan bayangan.
//
// Tata letak (tanah radius 45, plaza pusat radius 7):
//   utara (z -22)  : gedung kantor pusat
//   timur (x 25)   : arena olahraga
//   barat (x -25)  : area hiburan (panggung + layar)
//   selatan (z 18/27): 10 rumah, dua baris
//   barat laut      : taman
//   tepi            : pepohonan alam (posisi tetap, bukan acak)

import * as THREE from 'three';

export interface BuildingFootprint {
  id: string;
  name: string;
  kind: 'office' | 'arena' | 'entertainment' | 'house' | 'park';
  x: number;
  z: number;
  w: number;
  d: number;
  color: string;
}

export interface RoadRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface CityInfo {
  buildings: BuildingFootprint[];
  roads: RoadRect[];
  trees: { x: number; z: number }[];
  bounds: number;
}

const BOUNDS = 45;

function box(
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  roughness = 0.85,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeWindowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia');
  ctx.fillStyle = '#93a7bd';
  ctx.fillRect(0, 0, 256, 384);
  const cols = 6;
  const rows = 12;
  const cw = 256 / cols;
  const ch = 384 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Pola tetap (bukan acak) supaya fasad konsisten tiap muat.
      const lit = (c * 7 + r * 13) % 5 < 2;
      ctx.fillStyle = lit ? '#ffd27a' : '#334155';
      ctx.fillRect(c * cw + 7, r * ch + 7, cw - 14, ch - 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia');
  const grad = ctx.createLinearGradient(0, 0, 256, 144);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#ec4899');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 144);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HIBURAN', 128, 62);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('panggung • musik • film', 128, 100);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeTree(x: number, z: number, scale = 1): THREE.Group {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 0.9 * scale, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a5a3b, roughness: 1 }),
  );
  trunk.position.y = 0.45 * scale;
  trunk.castShadow = true;
  tree.add(trunk);
  const foliage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9 * scale, 0),
    new THREE.MeshStandardMaterial({ color: 0x4d7c4d, roughness: 1, flatShading: true }),
  );
  foliage.position.y = 1.5 * scale;
  foliage.castShadow = true;
  tree.add(foliage);
  return tree;
}

function makeHouse(x: number, z: number, color: number, index: number): THREE.Group {
  const house = new THREE.Group();
  house.position.set(x, 0, z);
  const body = box(4, 2.6, 3.5, color, 0, 1.3, 0);
  house.add(body);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.1, 1.7, 4),
    new THREE.MeshStandardMaterial({ color: 0x8a4a3b, roughness: 0.9, flatShading: true }),
  );
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.85);
  roof.position.y = 3.45;
  roof.castShadow = true;
  house.add(roof);
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x3b2f2f, roughness: 1 }),
  );
  door.position.set(0, 0.8, -1.78);
  door.rotation.y = Math.PI;
  house.add(door);
  house.userData.houseIndex = index;
  return house;
}

function makeBench(x: number, z: number, rotY: number): THREE.Group {
  const bench = new THREE.Group();
  bench.position.set(x, 0, z);
  bench.rotation.y = rotY;
  bench.add(box(1.6, 0.12, 0.5, 0x8a5a3b, 0, 0.45, 0));
  bench.add(box(1.6, 0.7, 0.1, 0x8a5a3b, 0, 0.75, -0.22));
  bench.add(box(0.12, 0.45, 0.45, 0x5b3a26, -0.65, 0.22, 0));
  bench.add(box(0.12, 0.45, 0.45, 0x5b3a26, 0.65, 0.22, 0));
  return bench;
}

export function buildCity(scene: THREE.Scene): { group: THREE.Group; info: CityInfo } {
  const group = new THREE.Group();
  const buildings: BuildingFootprint[] = [];
  const roads: RoadRect[] = [
    { x: 0, z: 0, w: 6, d: 84 },
    { x: 0, z: 0, w: 84, d: 6 },
  ];
  const trees: { x: number; z: number }[] = [];

  // Jalan utama (salib) + marka garis putus-putus.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 1 });
  roads.forEach((r) => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(r.x, 0.015, r.z);
    road.receiveShadow = true;
    group.add(road);
  });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let z = -40; z <= 40; z += 4) {
    if (Math.abs(z) < 8) continue; // lewati plaza
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.6), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.02, z);
    group.add(dash);
  }
  for (let x = -40; x <= 40; x += 4) {
    if (Math.abs(x) < 8) continue;
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.02, 0);
    group.add(dash);
  }

  // Gedung kantor pusat — 6 lantai (18 unit) + atap.
  const office = new THREE.Group();
  office.position.set(0, 0, -22);
  const winTex = makeWindowTexture();
  const sideMat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.8 });
  const plainMat = new THREE.MeshStandardMaterial({ color: 0x7d93a8, roughness: 0.85 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(16, 18, 10), [
    sideMat,
    sideMat,
    plainMat,
    plainMat,
    sideMat,
    sideMat,
  ]);
  tower.position.y = 9;
  tower.castShadow = true;
  tower.receiveShadow = true;
  office.add(tower);
  office.add(box(17, 0.6, 11, 0x5b6b7d, 0, 18.3, 0));
  office.add(box(4, 1.6, 3, 0x5b6b7d, -4, 19.4, 0));
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b4756, roughness: 0.6 }),
  );
  antenna.position.set(4, 21, 0);
  office.add(antenna);
  office.add(box(6, 0.5, 2.5, 0x9aa5b1, 0, 4.4, 5.6)); // kanopi pintu masuk
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 4),
    new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.4 }),
  );
  door.position.set(0, 2, 5.02);
  office.add(door);
  group.add(office);
  buildings.push({ id: 'hq', name: 'Gedung Kantor Pusat', kind: 'office', x: 0, z: -22, w: 16, d: 10, color: '#7d93a8' });

  // Arena olahraga — dinding melingkar + lapangan + lampu sorot.
  const arena = new THREE.Group();
  arena.position.set(25, 0, -12);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 8, 3, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xc96f4a, roughness: 0.9, side: THREE.DoubleSide }),
  );
  wall.position.y = 1.5;
  wall.castShadow = true;
  arena.add(wall);
  const field = new THREE.Mesh(
    new THREE.CircleGeometry(7.6, 48),
    new THREE.MeshStandardMaterial({ color: 0x6fae5f, roughness: 1 }),
  );
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.03;
  field.receiveShadow = true;
  arena.add(field);
  const line = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 2.6, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  );
  line.rotation.x = -Math.PI / 2;
  line.position.y = 0.04;
  arena.add(line);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(angle) * 8.6;
    const pz = Math.sin(angle) * 8.6;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b4756, roughness: 0.6 }),
    );
    pole.position.set(px, 3, pz);
    arena.add(pole);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.5, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffedb0, emissiveIntensity: 0.6 }),
    );
    head.position.set(px, 6.1, pz);
    head.lookAt(25, 0, -12);
    arena.add(head);
  }
  group.add(arena);
  buildings.push({ id: 'arena', name: 'Arena Olahraga', kind: 'arena', x: 25, z: -12, w: 16, d: 16, color: '#c96f4a' });

  // Area hiburan — panggung + layar + bangku penonton.
  const stage = new THREE.Group();
  stage.position.set(-25, 0, -12);
  stage.add(box(10, 1, 6, 0x6b5b8f, 0, 0.5, 0));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 4.5),
    new THREE.MeshStandardMaterial({ map: makeScreenTexture(), roughness: 0.7 }),
  );
  screen.position.set(0, 3.4, -2.8);
  stage.add(screen);
  for (let r = 0; r < 3; r++) {
    stage.add(box(9, 0.4, 0.8, 0x8a5a3b, 0, 0.2, 3.5 + r * 1.6));
  }
  group.add(stage);
  buildings.push({ id: 'stage', name: 'Panggung Hiburan', kind: 'entertainment', x: -25, z: -12, w: 12, d: 8, color: '#6b5b8f' });

  // Residensial — 10 rumah, dua baris.
  const houseColors = [0xe07856, 0xf2c14e, 0x7fb069, 0x6a8caf, 0xc08497];
  const houseXs = [-20, -10, 0, 10, 20];
  houseXs.forEach((x, i) => {
    group.add(makeHouse(x, 18, houseColors[i % houseColors.length], i));
    buildings.push({ id: `house-${i + 1}`, name: `Rumah ${i + 1}`, kind: 'house', x, z: 18, w: 4.5, d: 4, color: '#e07856' });
  });
  houseXs.forEach((x, i) => {
    group.add(makeHouse(x, 27, houseColors[(i + 2) % houseColors.length], i + 5));
    buildings.push({ id: `house-${i + 6}`, name: `Rumah ${i + 6}`, kind: 'house', x, z: 27, w: 4.5, d: 4, color: '#7fb069' });
  });

  // Taman — pepohonan + bangku.
  const parkTrees: [number, number][] = [
    [-27, 11],
    [-21, 17],
    [-18, 10],
    [-26, 18],
    [-22, 8],
  ];
  parkTrees.forEach(([x, z]) => {
    group.add(makeTree(x, z, 1.15));
    trees.push({ x, z });
  });
  group.add(makeBench(-24, 13, 0.4));
  group.add(makeBench(-20, 15, -0.6));
  buildings.push({ id: 'park', name: 'Taman', kind: 'park', x: -23, z: 13, w: 12, d: 12, color: '#4d7c4d' });

  // Alam — pepohonan di tepi kota (posisi tetap).
  const rimTrees: [number, number][] = [
    [34, 6],
    [36, 18],
    [30, 30],
    [14, 36],
    [-6, 38],
    [-24, 34],
    [-36, 26],
    [-38, 8],
    [-34, -24],
    [-14, -34],
    [8, -36],
    [28, -30],
    [38, -14],
    [-30, 30],
  ];
  rimTrees.forEach(([x, z]) => {
    group.add(makeTree(x, z, 0.9 + ((x + z) % 3) * 0.15));
    trees.push({ x, z });
  });

  // Bebatuan.
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9aa5b1, roughness: 1, flatShading: true });
  const rocks: [number, number, number][] = [
    [33, -24, 0.7],
    [-33, 22, 0.5],
    [12, -33, 0.6],
    [-12, 33, 0.45],
  ];
  rocks.forEach(([x, z, s]) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    rock.position.set(x, s * 0.5, z);
    rock.castShadow = true;
    group.add(rock);
  });

  scene.add(group);
  return { group, info: { buildings, roads, trees, bounds: BOUNDS } };
}
