// Behavior ambient agent — MASTER PROMPT §8 (status & aktivitas).
// Phase 3: mesin status sederhana per agent — berjalan menyusuri graf
// navigasi ke kawasan acak, lalu diam dengan aktivitas acak (menganggur /
// bekerja / berpikir / istirahat / sesekali merayakan). Bila tiba di tempat
// yang sudah ada agent lain sedang diam, keduanya meeting dan saling hadap.
// Status 'error' TIDAK dipicu simulasi ambient (hanya untuk kegagalan
// engine di Phase 4); animasinya sudah ada di AgentCharacter.

import type { Agent, AgentStatus } from '../types/agent';
import { findPath, getNode, NAV_NODES } from '../world/navigation/navGraph';

export interface BehaviorCallbacks {
  onMove: (id: string, x: number, z: number, yaw: number) => void;
  onStatus: (id: string, status: AgentStatus, location: string) => void;
}

const WALK_SPEED = 2.2;
const TURN_RATE = 6;

interface BehaviorAgent {
  id: string;
  node: string;
  path: string[];
  pathIdx: number;
  x: number;
  z: number;
  yaw: number;
  status: AgentStatus;
  dwellUntil: number;
  partnerId: string | null;
  location: string;
}

function turnToward(yaw: number, target: number, maxStep: number): number {
  let diff = target - yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return yaw + Math.sign(diff) * maxStep;
}

export class AgentBehavior {
  private readonly agents = new Map<string, BehaviorAgent>();
  private readonly cb: BehaviorCallbacks;
  // Phase 4: agent yang memegang tugas 'doing' fokus bekerja (bukan
  // aktivitas acak) selama tugasnya masih berjalan. Judul tugas hanya
  // dipakai penanda; status yang dilaporkan tetap 'working'.
  private readonly taskFocus = new Map<string, string | null>();

  setTaskFocus(agentId: string, taskTitle: string | null): void {
    this.taskFocus.set(agentId, taskTitle);
  }

  constructor(
    agents: Agent[],
    initial: { id: string; x: number; z: number }[],
    cb: BehaviorCallbacks,
  ) {
    this.cb = cb;
    agents.forEach((a, i) => {
      const pos = initial[i] ?? { x: 0, z: 0 };
      this.agents.set(a.id, {
        id: a.id,
        node: 'plaza',
        path: [],
        pathIdx: 0,
        x: pos.x,
        z: pos.z,
        // Hadap ke pusat plaza.
        yaw: Math.atan2(-pos.x, -pos.z),
        status: 'idle',
        // Berangkat bertahap supaya tidak serentak.
        dwellUntil: 2 + i * 0.7,
        partnerId: null,
        location: 'Plaza',
      });
    });
  }

  update(dt: number, now: number): void {
    this.agents.forEach((a) => this.updateAgent(a, dt, now));
  }

  private updateAgent(a: BehaviorAgent, dt: number, now: number): void {
    if (a.status === 'moving') {
      const target = getNode(a.path[a.pathIdx]);
      if (!target) {
        this.arrive(a, now);
        return;
      }
      const dx = target.x - a.x;
      const dz = target.z - a.z;
      const dist = Math.hypot(dx, dz);
      const step = WALK_SPEED * dt;
      a.yaw = turnToward(a.yaw, Math.atan2(dx, dz), TURN_RATE * dt);
      if (dist <= step) {
        a.x = target.x;
        a.z = target.z;
        a.pathIdx += 1;
        if (a.pathIdx >= a.path.length) this.arrive(a, now);
      } else {
        a.x += (dx / dist) * step;
        a.z += (dz / dist) * step;
      }
      this.cb.onMove(a.id, a.x, a.z, a.yaw);
      return;
    }
    if (now < a.dwellUntil) return;
    this.depart(a, now);
  }

  private arrive(a: BehaviorAgent, now: number): void {
    if (a.path.length > 0) {
      a.node = a.path[a.path.length - 1];
    }
    a.path = [];
    a.location = getNode(a.node)?.name ?? 'Plaza';
    const partner = this.findPartner(a);
    if (partner) {
      const dwell = now + 6 + Math.random() * 4;
      a.status = 'meeting';
      a.partnerId = partner.id;
      a.dwellUntil = dwell;
      partner.status = 'meeting';
      partner.partnerId = a.id;
      partner.dwellUntil = dwell;
      a.yaw = Math.atan2(partner.x - a.x, partner.z - a.z);
      partner.yaw = Math.atan2(a.x - partner.x, a.z - partner.z);
      this.cb.onMove(a.id, a.x, a.z, a.yaw);
      this.cb.onMove(partner.id, partner.x, partner.z, partner.yaw);
      this.cb.onStatus(a.id, 'meeting', a.location);
      this.cb.onStatus(partner.id, 'meeting', partner.location);
      return;
    }
    const roll = Math.random();
    // Phase 4: agent dengan tugas 'doing' tetap bekerja (bukan acak).
    if (this.taskFocus.get(a.id)) {
      a.status = 'working';
      a.dwellUntil = now + 8 + Math.random() * 4;
      this.cb.onStatus(a.id, 'working', a.location);
      return;
    }
    let status: AgentStatus = 'idle';
    if (roll < 0.4) status = 'idle';
    else if (roll < 0.65) status = 'working';
    else if (roll < 0.85) status = 'thinking';
    else if (roll < 0.95) status = 'resting';
    else status = 'celebrating';
    a.status = status;
    a.dwellUntil = now + 4 + Math.random() * 6;
    this.cb.onStatus(a.id, status, a.location);
  }

  private findPartner(a: BehaviorAgent): BehaviorAgent | null {
    for (const other of this.agents.values()) {
      if (other.id === a.id) continue;
      if (other.partnerId !== null) continue;
      if (other.status === 'moving') continue;
      if (Math.hypot(other.x - a.x, other.z - a.z) < 3) return other;
    }
    return null;
  }

  private depart(a: BehaviorAgent, now: number): void {
    if (a.partnerId) {
      const partner = this.agents.get(a.partnerId);
      if (partner) {
        partner.partnerId = null;
        partner.dwellUntil = now;
        if (partner.status === 'meeting') {
          partner.status = 'idle';
          this.cb.onStatus(partner.id, 'idle', partner.location);
        }
      }
      a.partnerId = null;
    }
    const dest = NAV_NODES[Math.floor(Math.random() * NAV_NODES.length)];
    const path = dest.id === a.node ? [a.node] : findPath(a.node, dest.id);
    a.path = path;
    a.pathIdx = path[0] === a.node ? 1 : 0;
    if (a.pathIdx >= a.path.length) {
      this.arrive(a, now);
      return;
    }
    a.status = 'moving';
    this.cb.onStatus(a.id, 'moving', a.location);
  }
}
