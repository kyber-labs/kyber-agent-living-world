// Game world engine — MASTER PROMPT §3 (dunia dasar) + §4 (kamera).
// Phase 1: engine boot yang benar-benar jalan — langit siang, tanah, cahaya,
// orbit controls, dan penanda agent sementara (kapsul berwarna + nama).
// Phase 2: kawasan kota (kantor 6 lantai, arena, hiburan, 10 rumah, taman,
// jalan, alam) + director lima mode kamera + minimap.
//
// PENANDA SEMENTARA: figur di sini BUKAN karakter final. Karakter 3D lengkap
// (animasi berjalan/duduk/mengetik, pakaian per peran) adalah Phase 3.
// Penanda ini hanya membuktikan engine, raycast, dan seleksi agent bekerja.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Agent } from '../../types/agent';
import { createWorldClock } from '../../simulation/clock';
import { buildCity, type CityInfo } from '../buildings/city';
import { CameraDirector, type CameraMode, type CameraState } from '../camera/CameraDirector';

export interface AgentPosition {
  id: string;
  x: number;
  z: number;
  color: string;
  selected: boolean;
}

export interface WorldHandle {
  dispose: () => void;
  resetCamera: () => void;
  selectAgent: (id: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  getCameraState: () => CameraState;
  getCityInfo: () => CityInfo;
  getAgentPositions: () => AgentPosition[];
  focusPoint: (x: number, z: number) => void;
}

export interface WorldOptions {
  agents: Agent[];
  onSelectAgent: (id: string | null) => void;
}

const CAMERA_HOME = new THREE.Vector3(14, 10, 14);
const TARGET_HOME = new THREE.Vector3(0, 0.8, 0);

function makeNameSprite(name: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia');
  ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
  ctx.beginPath();
  ctx.roundRect(4, 8, 248, 48, 12);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(2.0, 0.5, 1);
  return sprite;
}

export function createWorld(container: HTMLDivElement, options: WorldOptions): WorldHandle {
  const { agents, onSelectAgent } = options;
  const clock = createWorldClock();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.domElement.classList.add('world-gl');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfd9f2);
  scene.fog = new THREE.Fog(0xbfd9f2, 55, 120);

  const camera = new THREE.PerspectiveCamera(
    48,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    300,
  );
  camera.position.copy(CAMERA_HOME);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET_HOME);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 60;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.update();

  // Pencahayaan siang yang cerah (MASTER PROMPT §1).
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a7a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Tanah + grid + plaza pusat (fondasi kawasan — bangunannya Phase 2).
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(45, 64),
    new THREE.MeshStandardMaterial({ color: 0x9fbf8f, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(90, 45, 0x7d8a99, 0xb9c4cf);
  grid.position.y = 0.01;
  const gridMat = grid.material as THREE.Material;
  gridMat.transparent = true;
  gridMat.opacity = 0.35;
  scene.add(grid);

  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 0.9 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // Kawasan virtual Phase 2 (MASTER PROMPT §3).
  const city = buildCity(scene);

  // Penanda agent sementara (lihat catatan di atas file).
  const markers = new Map<string, THREE.Group>();
  const hitMeshes: THREE.Mesh[] = [];
  let selectedId: string | null = null;
  const skin = new THREE.MeshStandardMaterial({ color: 0xf2c9a0, roughness: 0.7 });
  agents.forEach((agent, i) => {
    const angle = (i / agents.length) * Math.PI * 2;
    const x = Math.cos(angle) * 5.5;
    const z = Math.sin(angle) * 5.5;
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.7, 6, 16),
      new THREE.MeshStandardMaterial({ color: agent.color, roughness: 0.6 }),
    );
    body.position.y = 0.85;
    body.castShadow = true;
    body.userData.agentId = agent.id;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), skin);
    head.position.y = 1.55;
    head.castShadow = true;
    head.userData.agentId = agent.id;
    group.add(head);

    const label = makeNameSprite(agent.name);
    label.position.y = 2.15;
    group.add(label);

    group.userData.phase = (i / agents.length) * Math.PI * 2;
    markers.set(agent.id, group);
    hitMeshes.push(body, head);
    scene.add(group);
  });

  // Cincin seleksi di bawah agent terpilih.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.75, 32),
    new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.visible = false;
  scene.add(ring);

  function selectAgent(id: string | null): void {
    selectedId = id;
    if (id === null) {
      ring.visible = false;
      return;
    }
    const group = markers.get(id);
    const agent = agents.find((a) => a.id === id);
    if (!group || !agent) return;
    ring.position.set(group.position.x, 0.03, group.position.z);
    (ring.material as THREE.MeshBasicMaterial).color.set(agent.color);
    ring.visible = true;
  }

  // Director lima mode kamera (MASTER PROMPT §4).
  const director = new CameraDirector(camera, controls, renderer.domElement, {
    getAgentPosition: (id) => {
      const g = markers.get(id);
      return g ? { x: g.position.x, z: g.position.z } : null;
    },
    getFollowTargetId: () => selectedId,
    getFirstAgentId: () => agents[0]?.id ?? null,
  });

  // Klik (bukan drag orbit): raycast ke penanda agent.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0;
  let downY = 0;
  function onPointerDown(e: PointerEvent): void {
    downX = e.clientX;
    downY = e.clientY;
  }
  function onPointerUp(e: PointerEvent): void {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    if (hits.length > 0) {
      const hit = hits[0].object as THREE.Mesh;
      onSelectAgent((hit.userData.agentId as string | undefined) ?? null);
    } else {
      onSelectAgent(null);
    }
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  let lastNow = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - lastNow) / 1000, 0.05);
    lastNow = now;
    const t = clock.elapsed();
    markers.forEach((group) => {
      group.position.y = Math.sin(t * 1.4 + (group.userData.phase as number)) * 0.03;
    });
    director.update(dt);
    renderer.render(scene, camera);
  });

  function dispose(): void {
    renderer.setAnimationLoop(null);
    director.dispose();
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    controls.dispose();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  }

  function resetCamera(): void {
    director.reset();
  }

  return {
    dispose,
    resetCamera,
    selectAgent,
    setCameraMode: (mode: CameraMode) => director.setMode(mode),
    getCameraState: () => director.getState(),
    getCityInfo: () => city.info,
    getAgentPositions: () =>
      agents.map((a) => {
        const g = markers.get(a.id);
        return {
          id: a.id,
          x: g?.position.x ?? 0,
          z: g?.position.z ?? 0,
          color: a.color,
          selected: selectedId === a.id,
        };
      }),
    focusPoint: (x: number, z: number) => director.panTo(x, z),
  };
}
