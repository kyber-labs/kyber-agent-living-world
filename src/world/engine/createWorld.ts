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
import type { MeetingAssignment, MeetingRoom } from '../../types/meeting';
import { MEETING_ROOMS } from '../../types/meeting';
import type { EventAssignment } from '../../types/event';
import type { WorldObject } from '../../types/worldObject';
import { isAnimalKind, type BuilderAnimalKind } from '../../types/worldObject';
import { buildWorldObject } from '../buildings/props';
import { BuilderAnimals } from '../animals/BuilderAnimals';
import { createWorldClock } from '../../simulation/clock';
import { computeLabelOffsets, labelScaleForDistance } from '../../simulation/labelLayout';
import { FpsTracker } from '../../simulation/fps';
import { LifeSim, type EnvironmentState, type Vitals, type WeatherKind } from '../../simulation/lifeSim';
import { environmentTargets } from '../../simulation/environment';
import { Animals } from '../animals/Animals';
import { AgentBehavior } from '../../simulation/behavior';
import { buildCity, type CityInfo } from '../buildings/city';
import { buildMeetingRooms } from '../buildings/meetingRooms';
import { CameraDirector, OVERVIEW_POS, OVERVIEW_TARGET, type CameraMode, type CameraState } from '../camera/CameraDirector';
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
  setTaskFocus: (agentId: string, taskTitle: string | null) => void;
  setMeetingAssignment: (agentId: string, assignment: MeetingAssignment | null) => void;
  setRoomActive: (roomId: string, active: boolean) => void;
  setEventAssignment: (agentId: string, assignment: EventAssignment | null) => void;
  setEventActive: (locationId: 'arena' | 'stage', active: boolean) => void;
  setWorldObjects: (objects: WorldObject[]) => void;
  /** 8.1: tampilkan/sembunyikan label nama semua agent (pengaturan "Atur"). */
  setLabelsVisible: (visible: boolean) => void;
  /**
   * 8.3.1: tampilkan/sembunyikan label nama ruangan meeting. Dipanggil
   * dari WorldView saat mode kamera berubah (sembunyi di Ikuti Agent /
   * Orang Pertama — kamera dekat, label ruangan menutupi label agent).
   */
  setRoomLabelsVisible: (visible: boolean) => void;
  getCameraState: () => CameraState;
  getCityInfo: () => CityInfo;
  getMeetingRooms: () => MeetingRoom[];
  getWorldObjects: () => WorldObject[];
  getAgentPositions: () => AgentPosition[];
  focusPoint: (x: number, z: number) => void;
}

export interface WorldOptions {
  agents: Agent[];
  onSelectAgent: (id: string | null) => void;
  onAgentState?: (id: string, status: AgentStatus, location: string) => void;
  onLifeTick?: (vitals: Record<string, Vitals>, env: EnvironmentState) => void;
  /** Dipanggil maksimal 1x/detik dengan FPS nyata + jumlah draw call frame terakhir. */
  onPerf?: (stats: PerfStats) => void;
  /** Dipanggil saat mode bangun aktif dan pengguna mengklik tanah. */
  onGroundClick?: (x: number, z: number) => void;
  /** Dipanggil saat mode bangun aktif dan kursor menyorot tanah (8.3). */
  onGroundHover?: (x: number, z: number) => void;
  /** True saat mode bangun (penempatan/pindah objek) sedang aktif. */
  isBuildMode?: () => boolean;
}

/** Statistik performa nyata dari renderer (FPS + draw call), untuk HUD. */
export interface PerfStats {
  fps: number;
  drawCalls: number;
}

export function createWorld(container: HTMLDivElement, options: WorldOptions): WorldHandle {
  const { agents, onSelectAgent } = options;
  const clock = createWorldClock();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.domElement.classList.add('world-gl');
  // Phase 7: pixel ratio dibatasi maks 2 — layar rapat (3x) tidak memaksa
  // renderer bekerja 3x lipat. Sudah ada sejak Phase 1, diverifikasi
  // tetap berlaku (tidak ada tempat lain yang mengubah pixel ratio).
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xccd9e4); // Phase 9: samakan dengan langit Pagi yang dihangatkan.
  // 3.2: kabut digeser (90–180) karena kamera Overview kini jauh (75 unit)
  // — kota (jarak 55–97) tetap jernih, hanya tepi tanah yang memudar.
  scene.fog = new THREE.Fog(0xccd9e4, 90, 180);

  const camera = new THREE.PerspectiveCamera(
    48,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    300,
  );
  camera.position.copy(OVERVIEW_POS);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(OVERVIEW_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  // Phase 9: 95 (dulu 60) — home Overview baru berjarak ~81 dari target;
  // tanpa ini OrbitControls.update() menjepit kamera kembali ke 60 dan
  // sudut curam akan memotong deret rumah selatan (bug yang sama seperti
  // yang diperbaiki 3.2). Pengguna juga bisa zoom-out lebih jauh untuk
  // melihat seluruh pulau.
  controls.maxDistance = 95;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.update();

  // Pencahayaan siang yang cerah (MASTER PROMPT §1).
  // Phase 5: intensitas + warna digeser tiap frame menuju target suasana
  // (pagi/siang/sore/malam + cuaca) lewat environmentTargets di bawah.
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a9a7a, 0.9);
  scene.add(hemi);
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

  // Phase 9: cincin pasir di tepi pulau (r 45–48,5) — pulau kampung
  // bertepi pantai seperti gambar konsep. TANPA laut di sekelilingnya
  // (lisensi artistik gambar konsep, bukan bagian rencana): di luar
  // cincin, tanah memudar ke kabut seperti sebelumnya.
  const sandRim = new THREE.Mesh(
    new THREE.RingGeometry(45, 48.5, 64),
    new THREE.MeshStandardMaterial({ color: 0xe7d3a1, roughness: 1 }),
  );
  sandRim.rotation.x = -Math.PI / 2;
  sandRim.position.y = 0.005;
  sandRim.receiveShadow = true;
  scene.add(sandRim);

  // Phase 9: grid disamarkan (opacity 0,35 -> 0,12, warna lebih pudar)
  // supaya tanah terbaca sebagai pulau kampung, bukan lapangan grafik.
  const grid = new THREE.GridHelper(90, 45, 0x9aa5b1, 0xccd5dd);
  grid.position.y = 0.01;
  const gridMat = grid.material as THREE.Material;
  gridMat.transparent = true;
  gridMat.opacity = 0.12;
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

  // Ruang meeting Phase 5 — zona bernama di kawasan yang sudah ada.
  const roomVisuals = buildMeetingRooms(scene, MEETING_ROOMS);

  // Phase 6: objek world builder (grup dibangun ulang tiap setWorldObjects)
  // + cincin penanda lokasi acara aktif (Arena / depan Panggung).
  const builderGroup = new THREE.Group();
  scene.add(builderGroup);
  let worldObjects: WorldObject[] = [];
  const eventRings = new Map<string, THREE.Mesh>();
  const eventRingDefs: { locationId: 'arena' | 'stage'; x: number; z: number; r: number; color: number }[] = [
    { locationId: 'arena', x: 25, z: -12, r: 4.6, color: 0x16a34a },
    { locationId: 'stage', x: -25, z: -6, r: 4.2, color: 0xdb2777 },
  ];
  eventRingDefs.forEach((def) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(def.r, def.r + 0.3, 48),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(def.x, 0.05, def.z);
    ring.visible = false;
    scene.add(ring);
    eventRings.set(def.locationId, ring);
  });

  // Life simulation Phase 5 — jam harian, cuaca, vital per agent.
  const lifeSim = new LifeSim(agents.map((a) => a.id));
  const initialEnv = lifeSim.getEnvironment();
  let envTargets = environmentTargets(initialEnv.period, initialEnv.weather);
  let currentWeather: WeatherKind = initialEnv.weather;
  // Kirim snapshot awal supaya HUD + panel detail langsung terisi.
  options.onLifeTick?.(lifeSim.getVitals(), initialEnv);

  // Hujan — titik-titik murah (500) yang jatuh dan berputar di atas kota;
  // hanya terlihat saat cuaca hujan, tanpa tekstur dan tanpa beban berarti.
  const RAIN_COUNT = 500;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN_COUNT * 3);
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 60;
    rainPos[i * 3 + 1] = Math.random() * 25;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainAttr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({
      color: 0x9db8d6,
      size: 0.14,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    }),
  );
  rain.visible = false;
  scene.add(rain);

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

  // Hewan ambient Phase 8.2 — dekorasi yang berkeliaran (bukan agent).
  const animals = new Animals(scene);

  // Hewan dari panel Builder (8.3) — titik rumahnya ditentukan Bos.
  const builderAnimals = new BuilderAnimals(scene);

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
    // Ambang 10px (3.2; sebelumnya 6): klik yang sedikit menggeser kamera
    // tetap dihitung klik, bukan drag orbit.
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    // Phase 6: mode bangun aktif — klik tanah menempatkan/memindah objek,
    // bukan memilih agent.
    if (options.isBuildMode?.()) {
      const groundHits = raycaster.intersectObject(ground, false);
      if (groundHits.length > 0) {
        const p = groundHits[0].point;
        options.onGroundClick?.(p.x, p.z);
      }
      return;
    }
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
  // 8.3: posisi kursor di tanah saat mode bangun aktif — ditampilkan di
  // panel Builder ("Posisi kursor: (x, z)") supaya Bos tahu persis titik
  // penempatannya sebelum mengklik.
  function onPointerMove(e: PointerEvent): void {
    if (!options.isBuildMode?.() || !options.onGroundHover) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const groundHits = raycaster.intersectObject(ground, false);
    if (groundHits.length > 0) {
      const p = groundHits[0].point;
      options.onGroundHover(p.x, p.z);
    }
  }
  renderer.domElement.addEventListener('pointermove', onPointerMove);

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  let lastNow = performance.now();
  // Phase 7: pelacak FPS nyata (dari delta requestAnimationFrame) +
  // waktu emisi terakhir ke React (maksimal 1x/detik).
  const fpsTracker = new FpsTracker();
  let lastPerfEmit = 0;
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    fpsTracker.push(now);
    const dt = Math.min((now - lastNow) / 1000, 0.05);
    lastNow = now;
    const t = clock.elapsed();
    behavior.update(dt, t);
    animals.update(dt, t);
    builderAnimals.update(dt, t);
    characters.forEach((character) => character.update(dt, t));
    // 8.3.1: tata letak label agent tiap frame — skala mengikuti jarak
    // kamera (label tak memenuhi layar saat kamera dekat) + offset
    // vertikal saat bergerombol (label tak bertumpuk). Hanya skala dan
    // posisi y yang diubah; visibilitas tetap milik pengaturan "Atur".
    const labelPositions = agents.map((a) => {
      const c = characters.get(a.id);
      return { x: c?.group.position.x ?? 0, z: c?.group.position.z ?? 0 };
    });
    const labelOffsets = computeLabelOffsets(labelPositions);
    agents.forEach((a, i) => {
      const c = characters.get(a.id);
      if (!c) return;
      c.setLabelLayout(labelScaleForDistance(camera.position.distanceTo(c.group.position)), labelOffsets[i]);
    });
    // Life sim: jam + cuaca + vital (emit ke React maksimal 1x/detik).
    const life = lifeSim.update(dt, liveState);
    if (life) {
      envTargets = environmentTargets(life.env.period, life.env.weather);
      currentWeather = life.env.weather;
      options.onLifeTick?.(life.vitals, life.env);
    }
    // Suasana 3D merapat halus ke target (periode hari + cuaca).
    const k = 1 - Math.exp(-dt * 1.2);
    const fog = scene.fog as THREE.Fog;
    (scene.background as THREE.Color).lerp(envTargets.sky, k);
    fog.color.lerp(envTargets.sky, k);
    fog.near += (envTargets.fogNear - fog.near) * k;
    fog.far += (envTargets.fogFar - fog.far) * k;
    sun.color.lerp(envTargets.sunColor, k);
    sun.intensity += (envTargets.sunIntensity - sun.intensity) * k;
    // 8.2: posisi matahari ikut bergeser (sore = rendah di barat = senja).
    sun.position.lerp(envTargets.sunPos, k);
    hemi.intensity += (envTargets.hemiIntensity - hemi.intensity) * k;
    // Hujan: titik jatuh, berputar ke atas saat menyentuh tanah.
    rain.visible = currentWeather === 'hujan';
    if (rain.visible) {
      const arr = rainAttr.array as Float32Array;
      for (let i = 0; i < RAIN_COUNT; i++) {
        let y = arr[i * 3 + 1] - 18 * dt;
        if (y < 0) {
          y = 22 + Math.random() * 3;
          arr[i * 3] = (Math.random() - 0.5) * 60;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
        arr[i * 3 + 1] = y;
      }
      rainAttr.needsUpdate = true;
    }
    director.update(dt);
    renderer.render(scene, camera);
    // Phase 7: FPS nyata + draw call frame ini, dilaporkan ke React
    // maksimal 1x/detik supaya HUD tidak me-render ulang tiap frame.
    if (now - lastPerfEmit >= 1000) {
      lastPerfEmit = now;
      options.onPerf?.({ fps: fpsTracker.getFps(), drawCalls: renderer.info.render.calls });
    }
  });

  function dispose(): void {
    renderer.setAnimationLoop(null);
    director.dispose();
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    rainGeo.dispose();
    (rain.material as THREE.Material).dispose();
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

  /** Bangun ulang isi grup builder dari daftar objek (dipanggil tiap berubah).
   *  Objek statis dibangun sebagai Group primitif; hewan (8.3) dirender
   *  BuilderAnimals sebagai InstancedMesh yang berkeliaran. */
  function setWorldObjects(objects: WorldObject[]): void {
    worldObjects = objects;
    while (builderGroup.children.length > 0) {
      const child = builderGroup.children[0];
      builderGroup.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mat = obj.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
    }
    objects.forEach((o) => {
      if (!isAnimalKind(o.kind)) {
        builderGroup.add(buildWorldObject(o.kind, o.x, o.z, o.rotY));
      }
    });
    builderAnimals.setAnimals(
      objects
        .filter((o): o is WorldObject & { kind: BuilderAnimalKind } => isAnimalKind(o.kind))
        .map((o) => ({ kind: o.kind, x: o.x, z: o.z })),
    );
  }

  return {
    dispose,
    resetCamera,
    selectAgent,
    setCameraMode: (mode: CameraMode) => director.setMode(mode),
    setTaskFocus: (agentId: string, taskTitle: string | null) =>
      behavior.setTaskFocus(agentId, taskTitle),
    setMeetingAssignment: (agentId: string, assignment: MeetingAssignment | null) =>
      behavior.setMeeting(agentId, assignment),
    setRoomActive: (roomId: string, active: boolean) => roomVisuals.setActive(roomId, active),
    setEventAssignment: (agentId: string, assignment: EventAssignment | null) =>
      behavior.setEvent(agentId, assignment),
    setEventActive: (locationId: 'arena' | 'stage', active: boolean) => {
      const ring = eventRings.get(locationId);
      if (ring) ring.visible = active;
    },
    setWorldObjects,
    setLabelsVisible: (visible: boolean) => {
      characters.forEach((character) => character.setLabelVisible(visible));
    },
    setRoomLabelsVisible: (visible: boolean) => {
      roomVisuals.setLabelsVisible(visible);
    },
    getCameraState: () => director.getState(),
    getCityInfo: () => city.info,
    getMeetingRooms: () => MEETING_ROOMS,
    getWorldObjects: () => worldObjects,
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
