import type { Agent, LiveAgentState } from '../types/agent';
import type { Task } from '../types/task';

interface Props {
  agents: Agent[];
  liveStates: LiveAgentState;
  dbConfigured: boolean;
  engineMode: 'live' | 'simulation';
  tasks: Task[];
}

export function Hud({ agents, liveStates, dbConfigured, engineMode, tasks }: Props) {
  const states = agents.map((a) => liveStates[a.id]?.status ?? a.status);
  const idle = states.filter((s) => s === 'idle').length;
  const working = states.filter((s) => s === 'working').length;
  const open = tasks.filter((t) => t.status !== 'done').length;
  return (
    <footer className="hud">
      <span>{agents.length} agent</span>
      <span>{idle} menganggur</span>
      <span>{working} bekerja</span>
      <span>{open} tugas terbuka</span>
      <span>AI: {engineMode === 'live' ? 'Gemini live' : 'Simulasi lokal'}</span>
      <span>Fase 4/7 — AI Engine &amp; Tugas</span>
      <span>Database: {dbConfigured ? 'terhubung' : 'belum dikonfigurasi'}</span>
    </footer>
  );
}
