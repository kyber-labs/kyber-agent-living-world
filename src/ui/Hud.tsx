import type { Agent } from '../types/agent';

interface Props {
  agents: Agent[];
  dbConfigured: boolean;
}

export function Hud({ agents, dbConfigured }: Props) {
  const idle = agents.filter((a) => a.status === 'idle').length;
  const working = agents.filter((a) => a.status === 'working').length;
  return (
    <footer className="hud">
      <span>{agents.length} agent</span>
      <span>{idle} menganggur</span>
      <span>{working} bekerja</span>
      <span>Fase 2/7 — Dunia &amp; Kamera</span>
      <span>Database: {dbConfigured ? 'terhubung' : 'belum dikonfigurasi'}</span>
    </footer>
  );
}
