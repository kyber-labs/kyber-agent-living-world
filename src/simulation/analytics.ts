// Analytics — Phase 6. Semua angka dihitung dari state nyata aplikasi
// (tugas, meeting, acara, status live, vital, cuaca/jam, objek builder) —
// TIDAK ada angka yang di-hardcode. Fungsi murni, mudah diuji; panel hanya
// menampilkan hasilnya. Export CSV juga fungsi murni (string).

import type { Agent, AgentStatus, LiveAgentState } from '../types/agent';
import type { Task } from '../types/task';
import type { Meeting } from '../types/meeting';
import type { CityEvent } from '../types/event';
import type { WorldObject, WorldObjectKind } from '../types/worldObject';
import { WORLD_OBJECT_CATALOG, WORLD_OBJECT_KIND_ORDER } from '../types/worldObject';
import type { EnvironmentState, Vitals } from './lifeSim';

export interface AnalyticsData {
  tasks: {
    total: number;
    todo: number;
    doing: number;
    done: number;
    /** Persen selesai (0–100). */
    donePct: number;
    byPriority: { low: number; medium: number; high: number };
    /** Belum selesai dan deadline sudah lewat. */
    overdue: number;
    topAssignee: { name: string; count: number } | null;
  };
  meetings: {
    total: number;
    active: number;
    ended: number;
    /** Total durasi meeting selesai (menit, dibulatkan). */
    totalMinutes: number;
    /** Rata-rata durasi meeting selesai (menit, 1 desimal). */
    avgMinutes: number;
    topParticipant: { name: string; count: number } | null;
    notesTotal: number;
  };
  events: {
    total: number;
    active: number;
    ended: number;
    matches: number;
    shows: number;
  };
  activity: {
    byStatus: Record<AgentStatus, number>;
    topLocation: { name: string; count: number } | null;
  };
  vitals: {
    avgEnergy: number;
    avgFocus: number;
    avgMood: number;
    lowestEnergy: { name: string; energy: number } | null;
  };
  env: EnvironmentState | null;
  objects: {
    total: number;
    byKind: Record<WorldObjectKind, number>;
  };
}

export interface AnalyticsInput {
  tasks: Task[];
  meetings: Meeting[];
  events: CityEvent[];
  liveStates: LiveAgentState;
  vitals: Record<string, Vitals>;
  env: EnvironmentState | null;
  objects: WorldObject[];
  agents: Agent[];
  /** Dipakai untuk hitung overdue; default hari ini. */
  now?: Date;
}

const ALL_STATUSES: AgentStatus[] = [
  'idle',
  'working',
  'thinking',
  'meeting',
  'moving',
  'celebrating',
  'resting',
  'error',
  'sports',
  'entertainment',
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function topEntry(counts: Map<string, number>): { name: string; count: number } | null {
  let best: { name: string; count: number } | null = null;
  counts.forEach((count, name) => {
    if (!best || count > best.count) best = { name, count };
  });
  return best;
}

export function computeAnalytics(input: AnalyticsInput): AnalyticsData {
  const { tasks, meetings, events, liveStates, vitals, env, objects, agents } = input;
  const now = input.now ?? new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nameOf = (id: string): string => agents.find((a) => a.id === id)?.name ?? id;

  // Tugas.
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const doing = tasks.filter((t) => t.status === 'doing').length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const byPriority = {
    low: tasks.filter((t) => t.priority === 'low').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    high: tasks.filter((t) => t.priority === 'high').length,
  };
  const overdue = tasks.filter(
    (t) => t.status !== 'done' && t.deadline !== null && t.deadline < today,
  ).length;
  const assigneeCounts = new Map<string, number>();
  tasks.forEach((t) => {
    if (!t.assigneeId) return;
    assigneeCounts.set(t.assigneeId, (assigneeCounts.get(t.assigneeId) ?? 0) + 1);
  });
  const topAssigneeRaw = topEntry(assigneeCounts);
  const topAssignee = topAssigneeRaw
    ? { name: nameOf(topAssigneeRaw.name), count: topAssigneeRaw.count }
    : null;

  // Meeting.
  const endedMeetings = meetings.filter((m) => m.status === 'ended');
  const durations = endedMeetings
    .filter((m) => m.endedAt !== null)
    .map((m) => (new Date(m.endedAt as string).getTime() - new Date(m.startedAt).getTime()) / 60000);
  const totalMinutes = Math.round(durations.reduce((a, b) => a + b, 0));
  const avgMinutes = durations.length > 0 ? round1(totalMinutes / durations.length) : 0;
  const participantCounts = new Map<string, number>();
  meetings.forEach((m) =>
    m.participantIds.forEach((id) => participantCounts.set(id, (participantCounts.get(id) ?? 0) + 1)),
  );
  const topParticipantRaw = topEntry(participantCounts);
  const topParticipant = topParticipantRaw
    ? { name: nameOf(topParticipantRaw.name), count: topParticipantRaw.count }
    : null;
  const notesTotal = meetings.reduce((n, m) => n + m.notes.length, 0);

  // Acara.
  const activeEvents = events.filter((e) => e.status === 'active').length;
  const endedEvents = events.filter((e) => e.status === 'ended').length;

  // Aktivitas live.
  const byStatus = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<AgentStatus, number>;
  const locationCounts = new Map<string, number>();
  agents.forEach((a) => {
    const state = liveStates[a.id];
    const status = state?.status ?? a.status;
    byStatus[status] += 1;
    const loc = state?.location ?? 'Plaza';
    locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1);
  });
  const topLocation = topEntry(locationCounts);

  // Vital (rata-rata dari agent yang vitalnya tersedia).
  const vitalList = agents
    .map((a) => ({ name: a.name, v: vitals[a.id] }))
    .filter((x): x is { name: string; v: Vitals } => x.v !== undefined);
  const avg = (key: keyof Vitals): number =>
    vitalList.length > 0 ? round1(vitalList.reduce((s, x) => s + x.v[key], 0) / vitalList.length) : 0;
  let lowestEnergy: { name: string; energy: number } | null = null;
  vitalList.forEach((x) => {
    if (!lowestEnergy || x.v.energy < lowestEnergy.energy) {
      lowestEnergy = { name: x.name, energy: Math.round(x.v.energy) };
    }
  });

  // Objek builder (8.3: hitungan per jenis mengikuti katalog 21 item).
  const byKind = Object.fromEntries(
    (Object.keys(WORLD_OBJECT_CATALOG) as WorldObjectKind[]).map((k) => [k, 0]),
  ) as Record<WorldObjectKind, number>;
  objects.forEach((o) => {
    byKind[o.kind] += 1;
  });

  return {
    tasks: {
      total: tasks.length,
      todo,
      doing,
      done,
      donePct: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
      byPriority,
      overdue,
      topAssignee,
    },
    meetings: {
      total: meetings.length,
      active: meetings.filter((m) => m.status === 'active').length,
      ended: endedMeetings.length,
      totalMinutes,
      avgMinutes,
      topParticipant,
      notesTotal,
    },
    events: {
      total: events.length,
      active: activeEvents,
      ended: endedEvents,
      matches: events.filter((e) => e.kind === 'match').length,
      shows: events.filter((e) => e.kind === 'show').length,
    },
    activity: { byStatus, topLocation },
    vitals: {
      avgEnergy: avg('energy'),
      avgFocus: avg('focus'),
      avgMood: avg('mood'),
      lowestEnergy,
    },
    env,
    objects: { total: objects.length, byKind },
  };
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Data analitik → teks CSV (bagian, metrik, nilai). */
export function analyticsToCsv(data: AnalyticsData): string {
  const rows: [string, string, string | number][] = [
    ['Tugas', 'Total', data.tasks.total],
    ['Tugas', 'To Do', data.tasks.todo],
    ['Tugas', 'Doing', data.tasks.doing],
    ['Tugas', 'Done', data.tasks.done],
    ['Tugas', 'Selesai (%)', data.tasks.donePct],
    ['Tugas', 'Prioritas tinggi', data.tasks.byPriority.high],
    ['Tugas', 'Prioritas sedang', data.tasks.byPriority.medium],
    ['Tugas', 'Prioritas rendah', data.tasks.byPriority.low],
    ['Tugas', 'Terlambat', data.tasks.overdue],
    ['Tugas', 'Pemegang tugas terbanyak', data.tasks.topAssignee ? `${data.tasks.topAssignee.name} (${data.tasks.topAssignee.count})` : '-'],
    ['Meeting', 'Total', data.meetings.total],
    ['Meeting', 'Berlangsung', data.meetings.active],
    ['Meeting', 'Selesai', data.meetings.ended],
    ['Meeting', 'Total durasi (menit)', data.meetings.totalMinutes],
    ['Meeting', 'Rata-rata durasi (menit)', data.meetings.avgMinutes],
    ['Meeting', 'Peserta tersering', data.meetings.topParticipant ? `${data.meetings.topParticipant.name} (${data.meetings.topParticipant.count})` : '-'],
    ['Meeting', 'Total catatan', data.meetings.notesTotal],
    ['Acara', 'Total', data.events.total],
    ['Acara', 'Berlangsung', data.events.active],
    ['Acara', 'Selesai', data.events.ended],
    ['Acara', 'Pertandingan', data.events.matches],
    ['Acara', 'Pertunjukan', data.events.shows],
    ['Vital (rata-rata)', 'Energi', data.vitals.avgEnergy],
    ['Vital (rata-rata)', 'Fokus', data.vitals.avgFocus],
    ['Vital (rata-rata)', 'Mood', data.vitals.avgMood],
    ['Vital', 'Energi terendah', data.vitals.lowestEnergy ? `${data.vitals.lowestEnergy.name} (${data.vitals.lowestEnergy.energy})` : '-'],
    ['Aktivitas', 'Lokasi tersering', data.activity.topLocation ? `${data.activity.topLocation.name} (${data.activity.topLocation.count})` : '-'],
    ['World builder', 'Total objek', data.objects.total],
    // 8.3: satu baris per jenis katalog (21 item), bukan hanya 4 jenis lama.
    ...WORLD_OBJECT_KIND_ORDER.map(
      (k) => ['World builder', WORLD_OBJECT_CATALOG[k].label, data.objects.byKind[k]] as [string, string, number],
    ),
  ];
  const header = 'Bagian,Metrik,Nilai';
  return [header, ...rows.map((r) => r.map(csvCell).join(','))].join('\n') + '\n';
}
