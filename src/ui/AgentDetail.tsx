import type { Agent, AgentStatus } from '../types/agent';
import { STATUS_LABEL } from '../types/agent';
import type { Task } from '../types/task';

interface Props {
  agent: Agent | null;
  liveState?: { status: AgentStatus; location: string };
  currentTask?: Task | null;
  onChat?: () => void;
}

export function AgentDetail({ agent, liveState, currentTask, onChat }: Props) {
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
