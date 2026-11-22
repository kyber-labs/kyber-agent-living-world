import type { Agent, LiveAgentState } from '../types/agent';

interface Props {
  agents: Agent[];
  liveStates: LiveAgentState;
  dbConfigured: boolean;
}

export function Hud({ agents, liveStates, dbConfigured }: Props) {
  const states = agents.map((a) => liveStates[a.id]?.status ?? a.status);
  const idle = states.filter((s) => s === 'idle').length;
  const working = states.filter((s) => s === 'working').length;
  return (
    <footer className="hud">
      <span>{agents.length} agent</span>
      <span>{idle} menganggur</span>
      <span>{working} bekerja</span>
      <span>Fase 3/7 — Karakter &amp; Navigasi</span>
      <span>Database: {dbConfigured ? 'terhubung' : 'belum dikonfigurasi'}</span>
    </footer>
  );
}
