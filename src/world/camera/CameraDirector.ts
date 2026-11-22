// Sistem kamera — MASTER PROMPT §4.
// Phase 2: lima mode kamera dengan transisi halus — Overview (orbit),
// Top View (dari atas), First Person (jalan kaki dengan WASD + seret
// untuk melihat), Follow Agent (mengikuti agent terpilih), dan Cinematic
// (orbit otomatis yang pelan). OrbitControls hanya aktif di mode orbit;
// mode lain dikendalikan director langsung.

import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type CameraMode = 'overview' | 'top' | 'first-person' | 'follow' | 'cinematic';

export interface CameraState {
  x: number;
  z: number;
  /** Sudut rotasi panah kamera di minimap (radian, 0 = menghadap atas peta). */
  heading: number;
  mode: CameraMode;
}

export interface DirectorOptions {
  getAgentPosition: (id: string) => { x: number; z: number } | null;
  getFollowTargetId: () => string | null;
  getFirstAgentId: () => string | null;
}

const OVERVIEW_POS = new THREE.Vector3(14, 10, 14);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0.8, 0);
const TOP_POS = new THREE.Vector3(0, 44, 0.01);
const TOP_TARGET = new THREE.Vector3(0, 0, 0);
const EYE_HEIGHT = 1.7;
const TRANSITION_SECONDS = 0.9;
const FOLLOW_OFFSET = new THREE.Vector3(4.5, 3.2, 4.5);
const WORLD_RADIUS = 42;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Transition {
  fromPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toPos: THREE.Vector3;
  toTarget: THREE.Vector3;
  t: number;
}

export class CameraDirector {
  private mode: CameraMode = 'overview';
  private transition: Transition | null = null;
  private yaw = 0;
  private pitch = 0;
  private readonly keys = new Set<string>();
  private dragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private cinematicAngle = Math.PI / 4;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly dom: HTMLElement;
  private readonly options: DirectorOptions;

  constructor(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    dom: HTMLElement,
    options: DirectorOptions,
  ) {
    this.camera = camera;
    this.controls = controls;
    this.dom = dom;
    this.options = options;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  getMode(): CameraMode {
    return this.mode;
  }

  setMode(mode: CameraMode): void {
    if (mode === this.mode && !this.transition) return;
    this.mode = mode;
    this.controls.enabled = false;
    if (mode === 'follow') {
      this.transition = null;
      return;
    }
    if (mode === 'cinematic') {
      this.transition = null;
      this.cinematicAngle = Math.atan2(this.camera.position.x, this.camera.position.z);
      return;
    }
    const toPos = mode === 'top' ? TOP_POS : mode === 'first-person' ? new THREE.Vector3(0, EYE_HEIGHT, 14) : OVERVIEW_POS;
    const toTarget = mode === 'top' ? TOP_TARGET : mode === 'first-person' ? new THREE.Vector3(0, 1.2, 0) : OVERVIEW_TARGET;
    this.transition = {
      fromPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toPos: toPos.clone(),
      toTarget: toTarget.clone(),
      t: 0,
    };
  }

  reset(): void {
    this.setMode('overview');
  }

  /** Geser pandangan ke titik (x, z) — hanya di mode orbit (overview/top). */
  panTo(x: number, z: number): void {
    if (this.mode !== 'overview' && this.mode !== 'top') return;
    const cx = THREE.MathUtils.clamp(x, -40, 40);
    const cz = THREE.MathUtils.clamp(z, -40, 40);
    const dx = cx - this.controls.target.x;
    const dz = cz - this.controls.target.z;
    this.camera.position.x += dx;
    this.camera.position.z += dz;
    this.controls.target.x = cx;
    this.controls.target.z = cz;
    this.controls.update();
  }

  getState(): CameraState {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return {
      x: this.camera.position.x,
      z: this.camera.position.z,
      heading: Math.atan2(dir.x, -dir.z),
      mode: this.mode,
    };
  }

  update(dt: number): void {
    if (this.transition) {
      const tr = this.transition;
      tr.t += dt / TRANSITION_SECONDS;
      const k = easeInOutCubic(Math.min(tr.t, 1));
      this.camera.position.lerpVectors(tr.fromPos, tr.toPos, k);
      const target = new THREE.Vector3().lerpVectors(tr.fromTarget, tr.toTarget, k);
      this.camera.lookAt(target);
      if (tr.t >= 1) {
        this.transition = null;
        this.controls.target.copy(tr.toTarget);
        if (this.mode === 'overview' || this.mode === 'top') {
          this.controls.enabled = true;
          this.controls.update();
        } else if (this.mode === 'first-person') {
          const dir = new THREE.Vector3().subVectors(tr.toTarget, tr.toPos).normalize();
          this.yaw = Math.atan2(-dir.x, -dir.z);
          this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
          this.camera.rotation.order = 'YXZ';
          this.camera.rotation.set(this.pitch, this.yaw, 0);
        }
      }
      return;
    }

    switch (this.mode) {
      case 'overview':
      case 'top':
        this.controls.update();
        break;
      case 'first-person':
        this.updateFirstPerson(dt);
        break;
      case 'follow':
        this.updateFollow(dt);
        break;
      case 'cinematic':
        this.updateCinematic(dt);
        break;
    }
  }

  private updateFirstPerson(dt: number): void {
    const speed = 6;
    let fx = 0;
    let fz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) fx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) fx += 1;
    if (fx !== 0 || fz !== 0) {
      const len = Math.hypot(fx, fz);
      fx /= len;
      fz /= len;
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      // Maju = -z lokal; kanan = +x lokal (yaw 0 menghadap -z).
      const dx = (-sin * -fz + cos * fx) * speed * dt;
      const dz = (-cos * -fz + -sin * fx) * speed * dt;
      const next = this.camera.position.clone();
      next.x += dx;
      next.z += dz;
      const r = Math.hypot(next.x, next.z);
      if (r > WORLD_RADIUS) {
        next.x *= WORLD_RADIUS / r;
        next.z *= WORLD_RADIUS / r;
      }
      this.camera.position.copy(next);
    }
    this.camera.position.y = EYE_HEIGHT;
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private updateFollow(dt: number): void {
    const id = this.options.getFollowTargetId() ?? this.options.getFirstAgentId();
    if (!id) return;
    const pos = this.options.getAgentPosition(id);
    if (!pos) return;
    const desired = new THREE.Vector3(pos.x + FOLLOW_OFFSET.x, FOLLOW_OFFSET.y, pos.z + FOLLOW_OFFSET.z);
    const k = 1 - Math.exp(-3 * dt);
    this.camera.position.lerp(desired, k);
    this.camera.lookAt(pos.x, 1, pos.z);
  }

  private updateCinematic(dt: number): void {
    this.cinematicAngle += dt * 0.05;
    const desired = new THREE.Vector3(
      Math.sin(this.cinematicAngle) * 22,
      7,
      Math.cos(this.cinematicAngle) * 22,
    );
    const k = 1 - Math.exp(-2 * dt);
    this.camera.position.lerp(desired, k);
    this.camera.lookAt(0, 2, 0);
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (this.mode !== 'first-person') return;
    this.dragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging || this.mode !== 'first-person') return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.yaw -= dx * 0.0032;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0032, -1.45, 1.45);
  };

  private readonly onPointerUp = (): void => {
    this.dragging = false;
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.mode !== 'first-person') return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  dispose(): void {
    this.dom.removeEventListener('pointerdown', this.onPointerDown);
    this.dom.removeEventListener('pointermove', this.onPointerMove);
    this.dom.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.keys.clear();
  }
}
