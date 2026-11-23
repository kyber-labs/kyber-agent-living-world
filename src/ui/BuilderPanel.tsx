// Panel world builder — Phase 6 (MASTER PROMPT §7).
// Pilih jenis objek, lalu klik tanah di dunia 3D untuk menempatkannya.
// Objek yang sudah ada bisa dipindah (klik "Pindah", lalu klik tanah
// tujuan) atau dihapus. Penempatan divalidasi (batas kota, tidak
// menabrak bangunan/objek lain) dan tersimpan di localStorage lewat
// WorldObjectStore.
//
// Phase 8.3: katalog 4 → 21 item (ala panel "Mode Bangun" screenshot
// "Kampus Nailong") + input Label (opsional) + slider Putaran (0–360°)
// + tampilan posisi ("Posisi: (x, z)") di daftar dan posisi kursor saat
// mode bangun/pindah aktif. Label HANYA tampil di panel (bukan label 3D
// mengambang — menghemat draw call; lihat docs/PHASES.md §8.3).

import type { WorldObject, WorldObjectKind } from '../types/worldObject';
import { WORLD_OBJECT_CATALOG, WORLD_OBJECT_KIND_ORDER } from '../types/worldObject';

export interface BuildMode {
  kind: WorldObjectKind;
  /** Bila terisi, klik tanah berikutnya memindah objek ini (bukan menambah). */
  movingId: string | null;
}

interface Props {
  objects: WorldObject[];
  buildMode: BuildMode | null;
  placementError: string | null;
  /** 8.3: label yang sedang diketik untuk penempatan/pindah. */
  label: string;
  /** 8.3: putaran yang sedang dipilih (derajat 0–360). */
  rotationDeg: number;
  /** 8.3: posisi kursor di tanah saat mode bangun/pindah aktif. */
  hoverPosition: { x: number; z: number } | null;
  onLabelChange: (label: string) => void;
  onRotationChange: (deg: number) => void;
  onPickKind: (kind: WorldObjectKind) => void;
  onCancelBuild: () => void;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function BuilderPanel({
  objects,
  buildMode,
  placementError,
  label,
  rotationDeg,
  hoverPosition,
  onLabelChange,
  onRotationChange,
  onPickKind,
  onCancelBuild,
  onMove,
  onDelete,
  onClose,
}: Props) {
  return (
    <section className="board-overlay" aria-label="World builder">
      <div className="board-header">
        <h2>
          World Builder <span className="muted">· {objects.length} objek</span>
        </h2>
        <div className="board-actions">
          <button type="button" onClick={onClose} aria-label="Tutup panel builder">
            ✕
          </button>
        </div>
      </div>
      <p className="muted">
        Pilih jenis objek, lalu klik tanah di dunia 3D untuk menempatkannya. Objek tersimpan otomatis dan
        tampil di dunia + minimap.
      </p>

      <h3 className="section-title">Katalog objek</h3>
      <div className="room-grid">
        {WORLD_OBJECT_KIND_ORDER.map((kind) => {
          const def = WORLD_OBJECT_CATALOG[kind];
          const active = buildMode !== null && buildMode.kind === kind && buildMode.movingId === null;
          return (
            <article key={kind} className="room-card" style={{ borderTopColor: def.color }}>
              <div className="room-name">{def.label}</div>
              <div className="muted">{def.hint}</div>
              <button type="button" className={active ? 'primary' : ''} onClick={() => onPickKind(kind)}>
                {active ? 'Klik tanah untuk menempatkan…' : 'Tempatkan'}
              </button>
            </article>
          );
        })}
      </div>

      {buildMode && (
        <div className="builder-form">
          <label>
            Label (opsional)
            <input
              type="text"
              value={label}
              maxLength={40}
              placeholder="mis. Toko Kopi"
              onChange={(e) => onLabelChange(e.target.value)}
            />
          </label>
          <label>
            Putaran: {Math.round(rotationDeg)}°
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={Math.round(rotationDeg)}
              onChange={(e) => onRotationChange(Number(e.target.value))}
              aria-label="Putaran objek (derajat)"
            />
          </label>
          <p className="assign-note">
            {buildMode.movingId
              ? 'Mode pindah aktif — klik tanah tujuan di dunia 3D.'
              : `Mode bangun aktif (${WORLD_OBJECT_CATALOG[buildMode.kind].label}) — klik tanah di dunia 3D.`}{' '}
            {hoverPosition && (
              <span className="muted">
                Posisi kursor: ({hoverPosition.x.toFixed(1)}, {hoverPosition.z.toFixed(1)})
              </span>
            )}{' '}
            <button type="button" onClick={onCancelBuild}>
              Batal
            </button>
          </p>
        </div>
      )}
      {placementError && <p className="error-text">{placementError}</p>}

      <h3 className="section-title">Objek di dunia</h3>
      {objects.length === 0 ? (
        <p className="muted">Belum ada objek. Tempatkan objek pertama dari katalog di atas.</p>
      ) : (
        <ul className="note-list">
          {objects.map((o) => {
            const def = WORLD_OBJECT_CATALOG[o.kind];
            const moving = buildMode?.movingId === o.id;
            const rotDeg = Math.round(((((o.rotY * 180) / Math.PI) % 360) + 360) % 360);
            return (
              <li key={o.id} className="note-item builder-item">
                <span>
                  <strong>{o.label ? o.label : def.label}</strong>
                  {o.label && <span className="muted"> · {def.label}</span>}
                  <span className="muted">
                    {' '}
                    · Posisi: ({o.x.toFixed(1)}, {o.z.toFixed(1)}) · Putaran: {rotDeg}°
                  </span>
                </span>
                <span className="builder-item-actions">
                  <button type="button" onClick={() => onMove(o.id)}>
                    {moving ? 'Memindah…' : 'Pindah'}
                  </button>
                  <button type="button" onClick={() => onDelete(o.id)}>
                    Hapus
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
