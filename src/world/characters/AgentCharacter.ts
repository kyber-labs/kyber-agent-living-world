// Karakter agent 3D — MASTER PROMPT §5 (karakter) + §8 (animasi status).
// Phase 3: humanoid low-poly dari primitif — kaki, torso warna peran, lengan,
// kepala, rambut, dan satu prop peran (laptop/notebook/perkakas/headset).
// Semua animasi prosedural (tanpa file model eksternal): berjalan, bekerja
// (mengetik), berpikir, meeting, merayakan, istirahat (duduk), error.
// Label di atas kepala menampilkan nama + peran + titik status (diperbarui
// saat status berubah).

import * as THREE from 'three';
import type { Agent, AgentStatus } from '../../types/agent';
import { STATUS_COLOR, STATUS_LABEL } from '../../types/agent';

const HAIR_COLORS = ['#2b2b2b', '#5b3a26', '#8a5a3b', '#d9a05b', '#3b4756'];
const SKIN_COLORS = ['#f2c9a0', '#e8b88a', '#d9a06b', '#f7d7b0'];

/** Prop kecil sesuai peran — null berarti tanpa prop tangan. */
function makeProp(agentId: string): THREE.Object3D | null {
  const mat = (color: number): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  switch (agentId) {
    case 'kai':
    case 'max': {
      // Laptop.
      const laptop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.35), mat(0x2b3a4a));
      laptop.position.set(0, -0.56, 0.22);
      return laptop;
    }
    case 'aria':
    case 'zoe':
    case 'mia': {
      // Notebook.
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.5), mat(0xf8fafc));
      book.position.set(0, -0.56, 0.2);
      return book;
    }
    case 'leo':
    case 'rex': {
      // Perkakas.
      const tool = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), mat(0x9aa5b1));
      tool.position.set(0, -0.5, 0.1);
      return tool;
    }
    case 'luna': {
      // Palet warna.
      const palette = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 20), mat(0xd9c9a8));
      palette.position.set(0, -0.56, 0.2);
      return palette;
    }
    case 'finn':
    case 'nova': {
      // Headset (dipasang di kepala, bukan tangan).
      const headset = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.035, 8, 20), mat(0x2b3a4a));
      headset.position.set(0, 0.14, 0);
      return headset;
    }
    default:
      return null;
  }
}

export class AgentCharacter {
  readonly group = new THREE.Group();
  private readonly agent: Agent;
  private status: AgentStatus;
  private walkPhase = 0;
  private readonly legL = new THREE.Group();
  private readonly legR = new THREE.Group();
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly head = new THREE.Group();
  private labelCanvas: HTMLCanvasElement | null = null;
  private labelTexture: THREE.CanvasTexture | null = null;

  constructor(
    agent: Agent,
    index: number,
  ) {
    this.agent = agent;
    this.status = agent.status;
    const color = new THREE.Color(agent.color);
    const dark = color.clone().multiplyScalar(0.75);
    const skin = new THREE.MeshStandardMaterial({
      color: SKIN_COLORS[index % SKIN_COLORS.length],
      roughness: 0.7,
    });
    const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const clothDark = new THREE.MeshStandardMaterial({ color: dark, roughness: 0.8 });

    // Kaki (pivot di pinggul).
    const legGeo = new THREE.BoxGeometry(0.16, 0.55, 0.18);
    this.legL.position.set(-0.11, 0.55, 0);
    this.legR.position.set(0.11, 0.55, 0);
    const legLMesh = new THREE.Mesh(legGeo, clothDark);
    legLMesh.position.y = -0.275;
    legLMesh.castShadow = true;
    legLMesh.userData.agentId = agent.id;
    const legRMesh = new THREE.Mesh(legGeo, clothDark);
    legRMesh.position.y = -0.275;
    legRMesh.castShadow = true;
    legRMesh.userData.agentId = agent.id;
    this.legL.add(legLMesh);
    this.legR.add(legRMesh);
    this.group.add(this.legL, this.legR);

    // Torso.
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), cloth);
    torsoMesh.position.y = 0.32;
    torsoMesh.castShadow = true;
    torsoMesh.userData.agentId = agent.id;
    this.torso.position.y = 0.55;
    this.torso.add(torsoMesh);
    this.group.add(this.torso);

    // Lengan (pivot di bahu).
    const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.16);
    this.armL.position.set(-0.34, 1.16, 0);
    this.armR.position.set(0.34, 1.16, 0);
    const armLMesh = new THREE.Mesh(armGeo, cloth);
    armLMesh.position.y = -0.26;
    armLMesh.castShadow = true;
    armLMesh.userData.agentId = agent.id;
    const armRMesh = new THREE.Mesh(armGeo, cloth);
    armRMesh.position.y = -0.26;
    armRMesh.castShadow = true;
    armRMesh.userData.agentId = agent.id;
    this.armL.add(armLMesh);
    this.armR.add(armRMesh);
    this.group.add(this.armL, this.armR);

    // Kepala + rambut.
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), skin);
    headMesh.position.y = 0.12;
    headMesh.castShadow = true;
    headMesh.userData.agentId = agent.id;
    this.head.position.y = 1.32;
    this.head.add(headMesh);
    const hairStyle = index % 3;
    const hairMat = new THREE.MeshStandardMaterial({
      color: HAIR_COLORS[index % HAIR_COLORS.length],
      roughness: 0.9,
    });
    if (hairStyle === 0) {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      hair.position.y = 0.16;
      this.head.add(hair);
    } else if (hairStyle === 1) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), hairMat);
      bun.position.set(0, 0.36, -0.05);
      this.head.add(bun);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.225, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat);
      cap.position.y = 0.15;
      this.head.add(cap);
    } else {
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.1), hairMat);
      back.position.set(0, 0.02, -0.19);
      this.head.add(back);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.225, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat);
      cap.position.y = 0.15;
      this.head.add(cap);
    }
    this.group.add(this.head);

    // Prop peran.
    const prop = makeProp(agent.id);
    if (prop) {
      if (agent.id === 'finn' || agent.id === 'nova') {
        this.head.add(prop);
      } else {
        this.armR.add(prop);
      }
    }

    // Label nama + peran + status.
    const label = this.makeLabelSprite();
    label.position.y = 2.05;
    this.group.add(label);

    // Silinder klik tak terlihat — target klik jauh lebih besar dari tubuh
    // (r 0,6, tinggi 2,2), supaya figur yang sedang berjalan tetap mudah
    // diklik (perbaikan 3.1: klik figur 3D gagal 4/4 di verifikasi live).
    // Material tidak menulis warna maupun kedalaman: murni proxy raycast.
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    hitMat.colorWrite = false;
    const hitCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 12), hitMat);
    hitCyl.position.y = 1.1;
    hitCyl.userData.agentId = agent.id;
    this.group.add(hitCyl);

    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.userData.agentId = agent.id;
    });
  }

  private makeLabelSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    this.labelCanvas = canvas;
    this.labelTexture = new THREE.CanvasTexture(canvas);
    this.drawLabel();
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.labelTexture, transparent: true, depthWrite: false }),
    );
    sprite.scale.set(2.2, 0.83, 1);
    return sprite;
  }

  private drawLabel(): void {
    const canvas = this.labelCanvas;
    const tex = this.labelTexture;
    if (!canvas || !tex) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 256, 96);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.beginPath();
    ctx.roundRect(4, 6, 248, 84, 12);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(this.agent.name, 128, 28);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(this.agent.role, 128, 56);
    ctx.fillStyle = STATUS_COLOR[this.status];
    ctx.beginPath();
    ctx.arc(88, 78, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '18px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(STATUS_LABEL[this.status], 100, 78);
    tex.needsUpdate = true;
  }

  setStatus(status: AgentStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.drawLabel();
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  /** Pindah + hadap (yaw radian, 0 = menghadap +z). */
  setPosition(x: number, z: number, yaw: number): void {
    this.group.position.x = x;
    this.group.position.z = z;
    this.group.rotation.y = yaw;
  }

  /** Target raycast untuk klik: semua mesh tubuh + silinder klik + label. */
  getHitTargets(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) out.push(obj);
    });
    return out;
  }

  /** Pose prosedural per status; dipanggil tiap frame. */
  update(dt: number, t: number): void {
    const s = this.status;
    // Reset pose dasar.
    this.torso.rotation.set(0, 0, 0);
    this.torso.position.y = 0.55;
    this.torso.scale.set(1, 1, 1);
    this.head.rotation.set(0, 0, 0);
    this.armL.rotation.set(0, 0, 0.12);
    this.armR.rotation.set(0, 0, -0.12);
    this.legL.rotation.set(0, 0, 0);
    this.legR.rotation.set(0, 0, 0);
    let baseY = 0;

    if (s === 'moving') {
      this.walkPhase += dt * 7;
      const swing = Math.sin(this.walkPhase);
      this.legL.rotation.x = swing * 0.6;
      this.legR.rotation.x = -swing * 0.6;
      this.armL.rotation.x = -swing * 0.5;
      this.armR.rotation.x = swing * 0.5;
      this.torso.rotation.x = 0.08;
      baseY = Math.abs(Math.cos(this.walkPhase)) * 0.05;
    } else if (s === 'working') {
      // Mengetik: lengan ke depan (laptop/notebook di tangan kanan ikut
      // terangkat), kepala menunduk, badan condong — terbaca dari jauh.
      this.armL.rotation.x = -1.15 + Math.sin(t * 8) * 0.12;
      this.armR.rotation.x = -1.15 + Math.sin(t * 8 + 1) * 0.12;
      this.head.rotation.x = 0.35;
      this.torso.rotation.x = 0.12;
    } else if (s === 'thinking') {
      this.armR.rotation.x = -1.9;
      this.armR.rotation.z = -0.4;
      this.head.rotation.z = 0.15;
      this.head.rotation.y = Math.sin(t * 0.7) * 0.2;
    } else if (s === 'meeting') {
      // Gestur bicara besar + angguk, supaya pasangan yang meeting terbaca.
      this.armR.rotation.x = -0.9 + Math.sin(t * 3) * 0.4;
      this.armL.rotation.x = -0.5 + Math.sin(t * 3 + 1) * 0.2;
      this.head.rotation.x = Math.sin(t * 2.2) * 0.12;
    } else if (s === 'celebrating') {
      this.armL.rotation.x = -2.6;
      this.armR.rotation.x = -2.6;
      this.armL.rotation.z = 0.35;
      this.armR.rotation.z = -0.35;
      baseY = Math.max(0, Math.sin(t * 5)) * 0.15;
    } else if (s === 'resting') {
      // Duduk: kaki terlipat, badan lebih rendah + condong ke belakang.
      this.legL.rotation.x = -1.5;
      this.legR.rotation.x = -1.5;
      this.torso.position.y = 0.22;
      this.torso.rotation.x = -0.15;
      this.armL.rotation.x = -0.9;
      this.armR.rotation.x = -0.9;
      this.head.rotation.x = 0.15;
    } else if (s === 'error') {
      this.head.rotation.y = Math.sin(t * 10) * 0.3;
      this.armL.rotation.z = 1.2;
      this.armR.rotation.z = -1.2;
    } else {
      // idle: napas + ayun kepala pelan.
      const breathe = Math.sin(t * 1.8) * 0.015;
      this.torso.scale.y = 1 + breathe;
      this.head.rotation.y = Math.sin(t * 0.5) * 0.25;
      this.armL.rotation.x = Math.sin(t * 1.8) * 0.05;
      this.armR.rotation.x = Math.sin(t * 1.8) * 0.05;
    }

    this.group.position.y = baseY;
  }
}
