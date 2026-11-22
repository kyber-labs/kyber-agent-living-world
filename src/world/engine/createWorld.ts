// Game world engine — MASTER PROMPT §3 (dunia dasar) + §4 (kamera).
// Phase 1: engine boot yang benar-benar jalan — langit siang, tanah, cahaya,
// orbit controls, dan penanda agent sementara (kapsul berwarna + nama).
// Phase 2: kawasan kota (kantor 6 lantai, arena, hiburan, 10 rumah, taman,
// jalan, alam) + director lima mode kamera + minimap.
//
// Phase 3: karakter agent 3D (humanoid low-poly dari primitif + prop peran)
// dengan animasi status prosedural dan behavior ambient yang berjalan
// menyusuri graf navigasi antar kawasan.
//
// Karakter di sini dibangun dari primitif Three.js (bukan file model
// eksternal) — itu pilihan gaya low-poly yang disengaja, bukan placeholder:
// tiap agent punya tubuh, rambut, prop peran, dan animasi yang berfungsi.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Agent, AgentStatus } from '../../types/agent';
import { createWorldClock } from '../../simulation/clock';
import { AgentBehavior } from '../../simulation/behavior';
import { buildCity, type CityInfo } from '../buildings/city';
import { CameraDirector, type CameraMode, type CameraState } from '../camera/CameraDirector';
import { AgentCharacter } from '../characters/AgentCharacter';

export interface AgentPosition {
  id: string;
  x: number;
  z: number;
  color: string;
  selected: boolean;
  status: AgentStatus;
  location: string;
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
  onAgentState?: (id: string, status: AgentStatus, location: string) => void;
}

const CAMERA_HOME = new THREE.Vector3(14, 10, 14);
const TARGET_HOME = new THREE.Vector3(0, 0.8, 0);

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

  // Karakter agent 3D + behavior ambient (Phase 3).
  const characters = new Map<string, AgentCharacter>();
  const hitTargets: THREE.Object3D[] = [];
  let selectedId: string | null = null;
  const liveState = new Map<string, { status: AgentStatus; location: string }>();
  const initialPositions = agents.map((agent, i) => {
    const angle = (i / agents.length) * Math.PI * 2;
    return { id: agent.id, x: Math.cos(angle) * 5.5, z: Math.sin(angle) * 5.5 };
  });
  agents.forEach((agent, i) => {
    const character = new AgentCharacter(agent, i);
    const pos = initialPositions[i];
    character.setPosition(pos.x, pos.z, Math.atan2(-pos.x, -pos.z));
    characters.set(agent.id, character);
    hitTargets.push(...character.getHitTargets());
    liveState.set(agent.id, { status: 'idle', location: 'Plaza' });
    scene.add(character.group);
  });

  const behavior = new AgentBehavior(agents, initialPositions, {
    onMove: (id, x, z, yaw) => {
      characters.get(id)?.setPosition(x, z, yaw);
    },
    onStatus: (id, status, location) => {
      characters.get(id)?.setStatus(status);
      liveState.set(id, { status, location });
      options.onAgentState?.(id, status, location);
    },
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
    const character = characters.get(id);
    const agent = agents.find((a) => a.id === id);
    if (!character || !agent) return;
    ring.position.set(character.group.position.x, 0.03, character.group.position.z);
    (ring.material as THREE.MeshBasicMaterial).color.set(agent.color);
    ring.visible = true;
  }

  // Director lima mode kamera (MASTER PROMPT §4).
  const director = new CameraDirector(camera, controls, renderer.domElement, {
    getAgentPosition: (id) => {
      const c = characters.get(id);
      return c ? { x: c.group.position.x, z: c.group.position.z } : null;
    },
    getFollowTargetId: () => selectedId,
    getFirstAgentId: () => agents[0]?.id ?? null,
  });

  // Klik (bukan drag orbit): raycast ke target klik agent — tubuh, silinder
  // klik tak terlihat, dan label nama (Phase 3.1: target diperbesar supaya
  // figur yang sedang berjalan tetap mudah diklik).
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
    const hits = raycaster.intersectObjects(hitTargets, false);
    if (hits.length > 0) {
      const hit = hits[0].object as THREE.Object3D;
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
    behavior.update(dt, t);
    characters.forEach((character) => character.update(dt, t));
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
        const c = characters.get(a.id);
        const state = liveState.get(a.id);
        return {
          id: a.id,
          x: c?.group.position.x ?? 0,
          z: c?.group.position.z ?? 0,
          color: a.color,
          selected: selectedId === a.id,
          status: state?.status ?? 'idle',
          location: state?.location ?? 'Plaza',
        };
      }),
    focusPoint: (x: number, z: number) => director.panTo(x, z),
  };
}
