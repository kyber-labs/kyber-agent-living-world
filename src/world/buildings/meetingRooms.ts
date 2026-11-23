// Visual ruang meeting — Phase 5.
// Tiap room: alas lingkaran berwarna + cincin pembatas + tiang penanda
// dengan label nama (sprite canvas, mengikuti pola label AgentCharacter).
// Room yang sedang dipakai meeting alasnya tampak lebih tegas.

import * as THREE from 'three';
import type { MeetingRoom } from '../../types/meeting';

export interface RoomVisuals {
  group: THREE.Group;
  setActive: (roomId: string, active: boolean) => void;
  /**
   * 8.3.1: tampilkan/sembunyikan label nama ruangan. Disembunyikan saat
   * mode Ikuti Agent / Orang Pertama (kamera dekat: label 3,4 unit
   * menutupi label agent yang diikuti); alas + cincin tetap terlihat,
   * jadi identifikasi ruangan di Overview tak berubah.
   */
  setLabelsVisible: (visible: boolean) => void;
}

function makeNameSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia');
  ctx.fillStyle = 'rgba(30, 41, 59, 0.88)';
  ctx.beginPath();
  ctx.roundRect(4, 6, 248, 52, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(3.4, 0.85, 1);
  return sprite;
}

export function buildMeetingRooms(scene: THREE.Scene, rooms: MeetingRoom[]): RoomVisuals {
  const group = new THREE.Group();
  const pads = new Map<string, THREE.MeshStandardMaterial>();
  const labels: THREE.Sprite[] = [];

  rooms.forEach((room) => {
    const color = new THREE.Color(room.color);
    const padMat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      roughness: 0.9,
    });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(room.x, 0.035, room.z);
    pad.receiveShadow = true;
    group.add(pad);
    pads.set(room.id, padMat);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 2.85, 40),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(room.x, 0.04, room.z);
    group.add(ring);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b4756, roughness: 0.6 }),
    );
    pole.position.set(room.x + 2.9, 1.1, room.z);
    pole.castShadow = true;
    group.add(pole);

    const label = makeNameSprite(room.name);
    label.position.set(room.x + 2.9, 2.7, room.z);
    labels.push(label);
    group.add(label);
  });

  scene.add(group);

  return {
    group,
    setActive(roomId: string, active: boolean): void {
      const mat = pads.get(roomId);
      if (mat) mat.opacity = active ? 0.65 : 0.3;
    },
    setLabelsVisible(visible: boolean): void {
      labels.forEach((label) => {
        label.visible = visible;
      });
    },
  };
}
