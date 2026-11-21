import { useEffect, useRef } from 'react';
import { createWorld, type WorldHandle } from '../world/engine/createWorld';
import type { Agent } from '../types/agent';

interface Props {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  worldHandle: { current: WorldHandle | null };
}

export function WorldView({ agents, selectedId, onSelect, worldHandle }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handle = createWorld(container, {
      agents,
      onSelectAgent: (id) => onSelectRef.current(id),
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

  return <div ref={containerRef} className="world-canvas" aria-label="Dunia 3D" />;
}
