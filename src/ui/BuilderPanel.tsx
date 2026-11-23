// Panel world builder — Phase 6 (MASTER PROMPT §7).
// Pilih jenis objek (pohon/bangku/lampu/air mancur), lalu klik tanah di
// dunia 3D untuk menempatkannya. Objek yang sudah ada bisa dipindah
// (klik "Pindah", lalu klik tanah tujuan) atau dihapus. Penempatan
// divalidasi (batas kota, tidak menabrak bangunan/objek lain) dan
// tersimpan di localStorage lewat WorldObjectStore.

import type { WorldObject, WorldObjectKind } from '../types/worldObject';
import { WORLD_OBJECT_CATALOG } from '../types/worldObject';

export interface BuildMode {
  kind: WorldObjectKind;
  /** Bila terisi, klik tanah berikutnya memindah objek ini (bukan menambah). */
  movingId: string | null;
}

interface Props {
  objects: WorldObject[];
  buildMode: BuildMode | null;
  placementError: string | null;
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
        {(Object.keys(WORLD_OBJECT_CATALOG) as WorldObjectKind[]).map((kind) => {
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
        <p className="assign-note">
          {buildMode.movingId
            ? 'Mode pindah aktif — klik tanah tujuan di dunia 3D.'
            : `Mode bangun aktif (${WORLD_OBJECT_CATALOG[buildMode.kind].label}) — klik tanah di dunia 3D.`}{' '}
          <button type="button" onClick={onCancelBuild}>
            Batal
          </button>
        </p>
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
            return (
              <li key={o.id} className="note-item builder-item">
                <span>
                  <strong>{def.label}</strong>
                  <span className="muted">
                    {' '}
                    · ({o.x.toFixed(1)}, {o.z.toFixed(1)})
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
