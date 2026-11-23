// Panel analytics — Phase 6 (MASTER PROMPT §7).
// Semua angka dihitung dari state nyata aplikasi (lihat
// src/simulation/analytics.ts) — bukan angka karangan. Tampilkan sebagai
// angka + bar CSS sederhana (tanpa library chart).
//
// Export CSV: unduh file .csv dari data yang sama.
// Export PDF: memakai jalur print browser (window.print) dengan CSS print
// yang hanya menampilkan panel ini — didokumentasikan apa adanya di
// docs/PHASES.md; ini BUKAN generator PDF.

import type { AnalyticsData } from '../simulation/analytics';
import { analyticsToCsv } from '../simulation/analytics';
import { STATUS_LABEL } from '../types/agent';
import { formatClock, PERIOD_LABEL, WEATHER_ICON, WEATHER_LABEL } from '../simulation/lifeSim';

interface Props {
  data: AnalyticsData;
  onClose: () => void;
}

function downloadCsv(csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'living-world-analytics.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function StatBar({ label, value, max, suffix = '' }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="stat-bar-row">
      <span className="stat-bar-label">{label}</span>
      <div className="stat-bar">
        <div className="stat-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="stat-bar-value">
        {value}
        {suffix}
      </span>
    </div>
  );
}

export function AnalyticsPanel({ data, onClose }: Props) {
  const totalTasks = Math.max(data.tasks.total, 1);
  const topStatus = (Object.entries(data.activity.byStatus) as [string, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <section className="board-overlay analytics-panel" aria-label="Analytics">
      <div className="board-header">
        <h2>Analytics</h2>
        <div className="board-actions">
          <button
            type="button"
            onClick={() => downloadCsv(analyticsToCsv(data))}
          >
            Export CSV
          </button>
          <button type="button" onClick={() => window.print()}>
            Cetak / Simpan PDF
          </button>
          <button type="button" onClick={onClose} aria-label="Tutup panel analytics">
            ✕
          </button>
        </div>
      </div>
      <p className="muted">
        Statistik nyata dari state aplikasi saat ini (simulasi). Cetak / Simpan PDF memakai dialog print
        browser — pilih &quot;Save as PDF&quot; di sana.
      </p>

      <h3 className="section-title">Tugas</h3>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-number">{data.tasks.total}</div>
          <div className="muted">Total tugas</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.tasks.donePct}%</div>
          <div className="muted">Selesai</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.tasks.overdue}</div>
          <div className="muted">Terlambat</div>
        </div>
      </div>
      <StatBar label="To Do" value={data.tasks.todo} max={totalTasks} />
      <StatBar label="Doing" value={data.tasks.doing} max={totalTasks} />
      <StatBar label="Done" value={data.tasks.done} max={totalTasks} />
      <p className="muted">
        Prioritas: tinggi {data.tasks.byPriority.high} · sedang {data.tasks.byPriority.medium} · rendah{' '}
        {data.tasks.byPriority.low}
        {data.tasks.topAssignee
          ? ` · Pemegang tugas terbanyak: ${data.tasks.topAssignee.name} (${data.tasks.topAssignee.count})`
          : ''}
      </p>

      <h3 className="section-title">Meeting</h3>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-number">{data.meetings.total}</div>
          <div className="muted">Total meeting</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.meetings.totalMinutes}</div>
          <div className="muted">Total durasi (menit)</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.meetings.avgMinutes}</div>
          <div className="muted">Rata-rata durasi (menit)</div>
        </div>
      </div>
      <p className="muted">
        Berlangsung {data.meetings.active} · selesai {data.meetings.ended} · catatan bersama{' '}
        {data.meetings.notesTotal}
        {data.meetings.topParticipant
          ? ` · Peserta tersering: ${data.meetings.topParticipant.name} (${data.meetings.topParticipant.count}×)`
          : ''}
      </p>

      <h3 className="section-title">Acara olahraga &amp; hiburan</h3>
      <p className="muted">
        Total {data.events.total} · berlangsung {data.events.active} · selesai {data.events.ended} ·
        pertandingan {data.events.matches} · pertunjukan {data.events.shows}
      </p>

      <h3 className="section-title">Aktivitas agent saat ini</h3>
      {topStatus.length === 0 ? (
        <p className="muted">Belum ada data aktivitas.</p>
      ) : (
        topStatus.map(([status, count]) => (
          <StatBar
            key={status}
            label={STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status}
            value={count}
            max={10}
          />
        ))
      )}
      <p className="muted">
        {data.activity.topLocation
          ? `Lokasi tersering: ${data.activity.topLocation.name} (${data.activity.topLocation.count} agent)`
          : ''}
      </p>

      <h3 className="section-title">Vital agent (rata-rata, simulasi)</h3>
      <StatBar label="Energi" value={data.vitals.avgEnergy} max={100} suffix="" />
      <StatBar label="Fokus" value={data.vitals.avgFocus} max={100} suffix="" />
      <StatBar label="Mood" value={data.vitals.avgMood} max={100} suffix="" />
      <p className="muted">
        {data.vitals.lowestEnergy
          ? `Energi terendah: ${data.vitals.lowestEnergy.name} (${data.vitals.lowestEnergy.energy})`
          : ''}
      </p>

      <h3 className="section-title">Dunia</h3>
      <p className="muted">
        {data.env
          ? `Jam ${formatClock(data.env.minutesOfDay)} · ${PERIOD_LABEL[data.env.period]} · ${WEATHER_ICON[data.env.weather]} ${WEATHER_LABEL[data.env.weather]}`
          : 'Jam: —'}
        {` · Objek builder: ${data.objects.total} (pohon ${data.objects.byKind.tree}, bangku ${data.objects.byKind.bench}, lampu ${data.objects.byKind.lamp}, air mancur ${data.objects.byKind.fountain})`}
      </p>
    </section>
  );
}
