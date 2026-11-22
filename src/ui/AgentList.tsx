import type { Agent, LiveAgentState } from '../types/agent';
import { STATUS_LABEL } from '../types/agent';

interface Props {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  liveStates: LiveAgentState;
}

export function AgentList({ agents, selectedId, onSelect, liveStates }: Props) {
  return (
    <aside className="sidebar">
      <h2>Agent ({agents.length})</h2>
      <ul className="agent-list">
        {agents.map((agent) => (
          <li key={agent.id}>
            <button
              type="button"
              className={selectedId === agent.id ? 'agent-item selected' : 'agent-item'}
              onClick={() => onSelect(agent.id)}
            >
              <span className="agent-dot" style={{ background: agent.color }} />
              <span className="agent-main">
                <span className="agent-name">{agent.name}</span>
                <span className="agent-role">{agent.role}</span>
              </span>
              <span className="agent-status">
                {STATUS_LABEL[liveStates[agent.id]?.status ?? agent.status]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
