import { useEffect, useRef } from 'react';
import { createWorld, type PerfStats, type WorldHandle } from '../world/engine/createWorld';
import { Minimap } from './Minimap';
import type { Agent, AgentStatus } from '../types/agent';
import type { EnvironmentState, Vitals } from '../simulation/lifeSim';

interface Props {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAgentState: (id: string, status: AgentStatus, location: string) => void;
  onLifeTick: (vitals: Record<string, Vitals>, env: EnvironmentState) => void;
  /** Dipanggil maksimal 1x/detik dengan FPS nyata + draw call (Phase 7). */
  onPerf: (stats: PerfStats) => void;
  worldHandle: { current: WorldHandle | null };
  /** Dipanggil saat mode bangun aktif dan pengguna mengklik tanah. */
  onGroundClick: (x: number, z: number) => void;
  /** True saat mode bangun (penempatan/pindah objek) sedang aktif. */
  isBuildMode: () => boolean;
}

export function WorldView({ agents, selectedId, onSelect, onAgentState, onLifeTick, onPerf, worldHandle, onGroundClick, isBuildMode }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  const onAgentStateRef = useRef(onAgentState);
  const onLifeTickRef = useRef(onLifeTick);
  const onPerfRef = useRef(onPerf);
  const onGroundClickRef = useRef(onGroundClick);
  const isBuildModeRef = useRef(isBuildMode);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onAgentStateRef.current = onAgentState;
    onLifeTickRef.current = onLifeTick;
    onPerfRef.current = onPerf;
    onGroundClickRef.current = onGroundClick;
    isBuildModeRef.current = isBuildMode;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handle = createWorld(container, {
      agents,
      onSelectAgent: (id) => onSelectRef.current(id),
      onAgentState: (id, status, location) => onAgentStateRef.current(id, status, location),
      onLifeTick: (vitals, env) => onLifeTickRef.current(vitals, env),
      onPerf: (stats) => onPerfRef.current(stats),
      onGroundClick: (x, z) => onGroundClickRef.current(x, z),
      isBuildMode: () => isBuildModeRef.current(),
    });
    worldHandle.current = handle;
    return () => {
      handle.dispose();
      worldHandle.current = null;
    };
    // Engine dibuat sekali saat mount; agents adalah konstanta roster.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    worldHandle.current?.selectAgent(selectedId);
  }, [selectedId, worldHandle]);

  return (
    <div ref={containerRef} className="world-canvas" aria-label="Dunia 3D">
      <Minimap worldHandle={worldHandle} />
    </div>
  );
}
