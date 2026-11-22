// Minimap 2D — MASTER PROMPT §4.
// Peta kecil kota dari atas: jalan, plaza, bangunan, pepohonan, posisi
// agent (titik warna + cincin bila terpilih), dan panah arah kamera.
// Klik minimap menggeser pandangan (mode Overview/Top) ke titik itu.

import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import type { WorldHandle } from '../world/engine/createWorld';

interface Props {
  worldHandle: { current: WorldHandle | null };
}

const SIZE = 180;
const WORLD = 45;

export function Minimap({ worldHandle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const draw = (): void => {
      const canvas = canvasRef.current;
      const handle = worldHandle.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const s = SIZE / (WORLD * 2 + 4);
          const toMap = (x: number, z: number): [number, number] => [
            SIZE / 2 + x * s,
            SIZE / 2 + z * s,
          ];
          ctx.clearRect(0, 0, SIZE, SIZE);
          ctx.fillStyle = '#dce8d5';
          ctx.fillRect(0, 0, SIZE, SIZE);
          if (handle) {
            const city = handle.getCityInfo();
            ctx.fillStyle = '#6b7280';
            city.roads.forEach((r) => {
              const [x, z] = toMap(r.x - r.w / 2, r.z - r.d / 2);
              ctx.fillRect(x, z, r.w * s, r.d * s);
            });
            ctx.fillStyle = '#d9c9a8';
            ctx.beginPath();
            ctx.arc(SIZE / 2, SIZE / 2, 7 * s, 0, Math.PI * 2);
            ctx.fill();
            city.buildings.forEach((b) => {
              const [x, z] = toMap(b.x - b.w / 2, b.z - b.d / 2);
              ctx.fillStyle = b.color;
              ctx.fillRect(x, z, b.w * s, b.d * s);
            });
            ctx.fillStyle = '#4d7c4d';
            city.trees.forEach((t) => {
              const [x, z] = toMap(t.x, t.z);
              ctx.beginPath();
              ctx.arc(x, z, 2, 0, Math.PI * 2);
              ctx.fill();
            });
            handle.getAgentPositions().forEach((a) => {
              const [x, z] = toMap(a.x, a.z);
              ctx.fillStyle = a.color;
              ctx.beginPath();
              ctx.arc(x, z, 4, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              if (a.selected) {
                ctx.strokeStyle = a.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, z, 6.5, 0, Math.PI * 2);
                ctx.stroke();
              }
            });
            const cam = handle.getCameraState();
            const [cx, cz] = toMap(cam.x, cam.z);
            ctx.save();
            ctx.translate(cx, cz);
            ctx.rotate(cam.heading);
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(4.5, 5);
            ctx.lineTo(-4.5, 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [worldHandle]);

  function onClick(e: ReactMouseEvent<HTMLCanvasElement>): void {
    const handle = worldHandle.current;
    const canvas = canvasRef.current;
    if (!handle || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * SIZE;
    const mz = ((e.clientY - rect.top) / rect.height) * SIZE;
    const s = SIZE / (WORLD * 2 + 4);
    handle.focusPoint((mx - SIZE / 2) / s, (mz - SIZE / 2) / s);
  }

  return (
    <canvas
      ref={canvasRef}
      className="minimap"
      width={SIZE}
      height={SIZE}
      onClick={onClick}
      aria-label="Minimap kota"
    />
  );
}
