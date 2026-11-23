import type { Agent, AgentStatus } from '../types/agent';
import { STATUS_LABEL } from '../types/agent';
import type { Task } from '../types/task';
import type { Vitals } from '../simulation/lifeSim';

interface Props {
  agent: Agent | null;
  liveState?: { status: AgentStatus; location: string };
  currentTask?: Task | null;
  vitals?: Vitals;
  onChat?: () => void;
}

const VITAL_ROWS: { key: keyof Vitals; label: string; color: string }[] = [
  { key: 'energy', label: 'Energi', color: '#f59e0b' },
  { key: 'focus', label: 'Fokus', color: '#8b5cf6' },
  { key: 'mood', label: 'Mood', color: '#ec4899' },
];

export function AgentDetail({ agent, liveState, currentTask, vitals, onChat }: Props) {
  if (!agent) {
    return (
      <aside className="detail">
        <h2>Detail Agent</h2>
        <p className="muted">Klik agent di daftar atau di dunia 3D untuk melihat detailnya.</p>
      </aside>
    );
  }
  return (
    <aside className="detail">
      <h2>Detail Agent</h2>
      <div className="detail-card" style={{ borderTopColor: agent.color }}>
        <div className="detail-name">{agent.name}</div>
        <div className="detail-role">{agent.role}</div>
        <div className="detail-row">
          <span>Status</span>
          <strong>{STATUS_LABEL[liveState?.status ?? agent.status]}</strong>
        </div>
        <div className="detail-row">
          <span>Lokasi</span>
          <strong>{liveState?.location ?? 'Plaza'}</strong>
        </div>
        {currentTask && (
          <div className="detail-row">
            <span>Tugas</span>
            <strong>{currentTask.title}</strong>
          </div>
        )}
        {vitals && (
          <div className="vital-block">
            {VITAL_ROWS.map((row) => (
              <div key={row.key} className="vital-row">
                <span className="vital-label">{row.label}</span>
                <div className="vital-bar">
                  <div
                    className="vital-fill"
                    style={{ width: `${Math.round(vitals[row.key])}%`, background: row.color }}
                  />
                </div>
                <span className="vital-value">{Math.round(vitals[row.key])}</span>
              </div>
            ))}
            <p className="vital-note">Vital simulasi — berubah mengikuti aktivitas &amp; cuaca.</p>
          </div>
        )}
        <p className="detail-desc">{agent.description}</p>
        {onChat && (
          <button type="button" className="primary detail-chat" onClick={onChat}>
            Chat dengan {agent.name}
          </button>
        )}
      </div>
    </aside>
  );
}
