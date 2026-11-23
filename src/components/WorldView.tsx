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
  /** Dipanggil saat mode bangun aktif dan kursor menyorot tanah (8.3). */
  onGroundHover: (x: number, z: number) => void;
  /** True saat mode bangun (penempatan/pindah objek) sedang aktif. */
  isBuildMode: () => boolean;
  /** 8.1: tampilkan/sembunyikan minimap (pengaturan "Atur"). */
  showMinimap: boolean;
  /** 8.1: tampilkan/sembunyikan label nama agent di 3D (pengaturan "Atur"). */
  showLabels: boolean;
  /**
   * 8.3.1: tampilkan/sembunyikan label nama ruangan meeting. App
   * mengisinya false saat mode Ikuti Agent / Orang Pertama (kamera dekat).
   */
  showRoomLabels: boolean;
}

export function WorldView({ agents, selectedId, onSelect, onAgentState, onLifeTick, onPerf, worldHandle, onGroundClick, onGroundHover, isBuildMode, showMinimap, showLabels, showRoomLabels }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  const onAgentStateRef = useRef(onAgentState);
  const onLifeTickRef = useRef(onLifeTick);
  const onPerfRef = useRef(onPerf);
  const onGroundClickRef = useRef(onGroundClick);
  const onGroundHoverRef = useRef(onGroundHover);
  const isBuildModeRef = useRef(isBuildMode);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onAgentStateRef.current = onAgentState;
    onLifeTickRef.current = onLifeTick;
    onPerfRef.current = onPerf;
    onGroundClickRef.current = onGroundClick;
    onGroundHoverRef.current = onGroundHover;
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
      onGroundHover: (x, z) => onGroundHoverRef.current(x, z),
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

  // 8.1: label nama mengikuti pengaturan "Atur". Efek ini dideklarasikan
  // SETELAH efek mount di atas, jadi saat mount ia berjalan setelah
  // dunia dibuat (worldHandle sudah terisi).
  useEffect(() => {
    worldHandle.current?.setLabelsVisible(showLabels);
  }, [showLabels, worldHandle]);

  // 8.3.1: label ruangan mengikuti mode kamera — sembunyi saat Ikuti
  // Agent / Orang Pertama supaya tak menutupi label agent yang diikuti.
  useEffect(() => {
    worldHandle.current?.setRoomLabelsVisible(showRoomLabels);
  }, [showRoomLabels, worldHandle]);

  return (
    <div ref={containerRef} className="world-canvas" aria-label="Dunia 3D">
      {showMinimap && <Minimap worldHandle={worldHandle} />}
    </div>
  );
}
