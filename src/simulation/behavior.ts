// Behavior ambient agent — MASTER PROMPT §8 (status & aktivitas).
// Phase 3: mesin status sederhana per agent — berjalan menyusuri graf
// navigasi ke kawasan acak, lalu diam dengan aktivitas acak (menganggur /
// bekerja / berpikir / istirahat / sesekali merayakan). Bila tiba di tempat
// yang sudah ada agent lain sedang diam, keduanya meeting dan saling hadap.
// Status 'error' TIDAK dipicu simulasi ambient (hanya untuk kegagalan
// engine di Phase 4); animasinya sudah ada di AgentCharacter.

import type { Agent, AgentStatus } from '../types/agent';
import type { MeetingAssignment } from '../types/meeting';
import type { EventAssignment } from '../types/event';
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
  /** True bila sedang mengikuti meeting terjadwal (bukan meeting ambient). */
  scheduledMeeting: boolean;
  /** Tujuan jalan lurus (ke slot di dalam room) — bukan simpul graf. */
  directTarget: { x: number; z: number } | null;
  /** True bila sedang mengikuti acara terjadwal (olahraga/hiburan). */
  inEvent: boolean;
  /** Aktivitas yang ditunggu saat tiba di Arena/Panggung (ambient). */
  pendingActivity: 'sports' | 'entertainment' | null;
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
  // Phase 5: penugasan meeting terjadwal — agent berjalan ke room, lalu
  // berdiri di slotnya dan berstatus 'meeting' selama penugasan ada.
  private readonly meetingAssignments = new Map<string, MeetingAssignment>();
  // Phase 6: penugasan acara terjadwal — agent berjalan ke Arena/Panggung,
  // lalu berdiri di slotnya dan berstatus 'sports'/'entertainment' selama
  // penugasan ada. Meeting dan acara saling mengecualikan (divalidasi di UI).
  private readonly eventAssignments = new Map<string, EventAssignment>();

  setTaskFocus(agentId: string, taskTitle: string | null): void {
    this.taskFocus.set(agentId, taskTitle);
  }

  /**
   * Tetapkan / cabut penugasan meeting satu agent. Bila diberi room, agent
   * segera berangkat ke room itu (memutus meeting ambient bila sedang
   * berlangsung); bila dicabut, agent bubar dari room pada tick berikut.
   */
  setMeeting(agentId: string, room: MeetingAssignment | null): void {
    const a = this.agents.get(agentId);
    if (!a) return;
    if (room) {
      if (a.partnerId) this.releasePartner(a, 0);
      this.meetingAssignments.set(agentId, room);
      a.scheduledMeeting = true;
      a.directTarget = null;
      if (a.status !== 'moving') a.dwellUntil = 0;
      return;
    }
    this.meetingAssignments.delete(agentId);
    a.directTarget = null;
    if (a.scheduledMeeting && a.status === 'meeting') {
      a.dwellUntil = 0; // bubar: berangkat pada tick berikut
    }
    a.scheduledMeeting = false;
  }

  /**
   * Tetapkan / cabut penugasan acara satu agent. Bila diberi lokasi, agent
   * segera berangkat ke sana (memutus meeting ambient bila sedang
   * berlangsung); bila dicabut, agent bubar dari lokasi pada tick berikut.
   */
  setEvent(agentId: string, assignment: EventAssignment | null): void {
    const a = this.agents.get(agentId);
    if (!a) return;
    if (assignment) {
      if (a.partnerId) this.releasePartner(a, 0);
      this.eventAssignments.set(agentId, assignment);
      a.inEvent = true;
      a.directTarget = null;
      if (a.status !== 'moving') a.dwellUntil = 0;
      return;
    }
    this.eventAssignments.delete(agentId);
    a.directTarget = null;
    if (a.inEvent && (a.status === 'sports' || a.status === 'entertainment')) {
      a.dwellUntil = 0; // bubar: berangkat pada tick berikut
    }
    a.inEvent = false;
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
        scheduledMeeting: false,
        directTarget: null,
        inEvent: false,
        pendingActivity: null,
      });
    });
  }

  update(dt: number, now: number): void {
    this.agents.forEach((a) => this.updateAgent(a, dt, now));
  }

  private updateAgent(a: BehaviorAgent, dt: number, now: number): void {
    if (a.status === 'moving') {
      // Phase 5: jalan lurus ke slot di dalam room (bukan simpul graf).
      if (a.directTarget) {
        const dx = a.directTarget.x - a.x;
        const dz = a.directTarget.z - a.z;
        const dist = Math.hypot(dx, dz);
        const step = WALK_SPEED * dt;
        a.yaw = turnToward(a.yaw, Math.atan2(dx, dz), TURN_RATE * dt);
        if (dist <= step) {
          a.x = a.directTarget.x;
          a.z = a.directTarget.z;
          a.directTarget = null;
          // Phase 6: slot acara (bukan slot meeting) → mulai aktivitas acara.
          if (this.eventAssignments.has(a.id)) this.beginEvent(a, now);
          else this.beginMeeting(a, now);
        } else {
          a.x += (dx / dist) * step;
          a.z += (dz / dist) * step;
        }
        this.cb.onMove(a.id, a.x, a.z, a.yaw);
        return;
      }
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
        if (a.pathIdx >= a.path.length) {
          // Tiba di simpul terakhir — bila ini simpul room, lanjut jalan
          // lurus ke slot; bila bukan, proses kedatangan biasa.
          if (a.path.length > 0) a.node = a.path[a.path.length - 1];
          a.path = [];
          const assignment = this.meetingAssignments.get(a.id);
          if (assignment && a.node === assignment.nodeId) {
            a.directTarget = { x: assignment.slotX, z: assignment.slotZ };
            a.location = assignment.roomName;
            return;
          }
          // Phase 6: bila ini simpul lokasi acara, lanjut ke slot acara.
          const eventAssignment = this.eventAssignments.get(a.id);
          if (eventAssignment && a.node === eventAssignment.nodeId) {
            a.directTarget = { x: eventAssignment.slotX, z: eventAssignment.slotZ };
            a.location = eventAssignment.locationName;
            return;
          }
          this.arrive(a, now);
        }
      } else {
        a.x += (dx / dist) * step;
        a.z += (dz / dist) * step;
      }
      this.cb.onMove(a.id, a.x, a.z, a.yaw);
      return;
    }
    // Phase 5: peserta meeting terjadwal tetap di room selama penugasan ada.
    const assignment = this.meetingAssignments.get(a.id);
    if (a.status === 'meeting' && a.scheduledMeeting && assignment && a.node === assignment.nodeId) {
      a.dwellUntil = now + 20;
      return;
    }
    // Phase 6: peserta acara tetap di lokasi selama penugasan ada.
    const eventAssignment = this.eventAssignments.get(a.id);
    if (
      (a.status === 'sports' || a.status === 'entertainment') &&
      a.inEvent &&
      eventAssignment &&
      a.node === eventAssignment.nodeId
    ) {
      a.dwellUntil = now + 20;
      return;
    }
    if (now < a.dwellUntil) return;
    this.depart(a, now);
  }

  /** Agent tiba di slot room: hadap pusat room, status 'meeting'. */
  private beginMeeting(a: BehaviorAgent, now: number): void {
    const assignment = this.meetingAssignments.get(a.id);
    if (!assignment) {
      // Meeting keburu berakhir saat berjalan ke slot — kedatangan biasa.
      this.arrive(a, now);
      return;
    }
    a.yaw = Math.atan2(assignment.x - a.x, assignment.z - a.z);
    a.location = assignment.roomName;
    a.status = 'meeting';
    a.dwellUntil = now + 20;
    this.cb.onMove(a.id, a.x, a.z, a.yaw);
    this.cb.onStatus(a.id, 'meeting', a.location);
  }

  /** Agent tiba di slot acara: hadap pusat lokasi, status 'sports'/'entertainment'. */
  private beginEvent(a: BehaviorAgent, now: number): void {
    const assignment = this.eventAssignments.get(a.id);
    if (!assignment) {
      // Acara keburu berakhir saat berjalan ke slot — kedatangan biasa.
      this.arrive(a, now);
      return;
    }
    a.yaw = Math.atan2(assignment.x - a.x, assignment.z - a.z);
    a.location = assignment.locationName;
    a.status = assignment.status;
    a.dwellUntil = now + 20;
    this.cb.onMove(a.id, a.x, a.z, a.yaw);
    this.cb.onStatus(a.id, a.status, a.location);
  }

  private arrive(a: BehaviorAgent, now: number): void {
    if (a.path.length > 0) {
      a.node = a.path[a.path.length - 1];
    }
    a.path = [];
    a.location = getNode(a.node)?.name ?? 'Plaza';
    // Phase 5: agent berpenugasan meeting tidak ikut aktivitas acak.
    const assignment = this.meetingAssignments.get(a.id);
    if (assignment) {
      if (a.node !== assignment.nodeId) {
        // Belum sampai room — lanjutkan perjalanan ke sana.
        this.depart(a, now);
        return;
      }
      // Sudah di simpul room — jalan lurus ke slot.
      a.directTarget = { x: assignment.slotX, z: assignment.slotZ };
      a.status = 'moving';
      this.cb.onStatus(a.id, 'moving', a.location);
      return;
    }
    // Phase 6: agent berpenugasan acara tidak ikut aktivitas acak.
    const eventAssignment = this.eventAssignments.get(a.id);
    if (eventAssignment) {
      if (a.node !== eventAssignment.nodeId) {
        // Belum sampai lokasi — lanjutkan perjalanan ke sana.
        this.depart(a, now);
        return;
      }
      // Sudah di simpul lokasi — jalan lurus ke slot.
      a.directTarget = { x: eventAssignment.slotX, z: eventAssignment.slotZ };
      a.status = 'moving';
      this.cb.onStatus(a.id, 'moving', a.location);
      return;
    }
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
    // Phase 6: aktivitas ambient olahraga/hiburan — agent yang tiba di
    // Arena/Panggung sesekali berolahraga / menikmati hiburan, bukan acak.
    if (a.pendingActivity && (a.node === 'arena' || a.node === 'stage')) {
      a.status = a.pendingActivity;
      a.pendingActivity = null;
      a.dwellUntil = now + 8 + Math.random() * 6;
      this.cb.onStatus(a.id, a.status, a.location);
      return;
    }
    a.pendingActivity = null;
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
      // Phase 5: peserta meeting terjadwal tidak ditarik ke meeting ambient.
      if (other.scheduledMeeting || this.meetingAssignments.has(other.id)) continue;
      // Phase 6: peserta acara terjadwal tidak ditarik ke meeting ambient.
      if (other.inEvent || this.eventAssignments.has(other.id)) continue;
      if (Math.hypot(other.x - a.x, other.z - a.z) < 3) return other;
    }
    return null;
  }

  /** Lepaskan pasangan meeting ambient (dipakai depart + setMeeting). */
  private releasePartner(a: BehaviorAgent, now: number): void {
    if (!a.partnerId) return;
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

  private depart(a: BehaviorAgent, now: number): void {
    this.releasePartner(a, now);
    // Phase 5: agent berpenugasan meeting berangkat ke room, bukan acak.
    // Phase 6: agent berpenugasan acara berangkat ke lokasi acara.
    const assignment = this.meetingAssignments.get(a.id);
    const eventAssignment = this.eventAssignments.get(a.id);
    const destNode = assignment
      ? assignment.nodeId
      : eventAssignment
        ? eventAssignment.nodeId
        : null;
    const dest = destNode
      ? (getNode(destNode) ?? NAV_NODES[Math.floor(Math.random() * NAV_NODES.length)])
      : NAV_NODES[Math.floor(Math.random() * NAV_NODES.length)];
    // Phase 6: tujuan acak Arena/Panggung sesekali jadi aktivitas
    // olahraga/hiburan saat tiba (bukan sekadar mampir).
    if (!destNode && dest.id === 'arena' && Math.random() < 0.3) {
      a.pendingActivity = 'sports';
    } else if (!destNode && dest.id === 'stage' && Math.random() < 0.3) {
      a.pendingActivity = 'entertainment';
    } else {
      a.pendingActivity = null;
    }
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
