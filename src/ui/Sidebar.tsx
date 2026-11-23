// Sidebar navigasi — Phase 8.1 (redesain ala "Kampus Nailong").
// Rel sempit di kiri (ikon + label kecil): 8 bagian. Klik bagian
// mengganti panel yang tampil di App — setiap item HARUS membuka
// sesuatu yang berfungsi (aturan MASTER PROMPT: tanpa tombol
// dekoratif). Warna aktif memakai indigo tema aplikasi (#6366F1),
// BUKAN hijau (hijau itu tema artifact lain di screenshot acuan).
// Ikon digambar inline SVG (stroke currentColor), tanpa emoji.

export type Section =
  | 'world'
  | 'agents'
  | 'tasks'
  | 'meetings'
  | 'events'
  | 'builder'
  | 'analytics'
  | 'activity'
  | 'settings';

interface Item {
  id: Section;
  label: string;
  icon: React.ReactNode;
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const ITEMS: Item[] = [
  {
    id: 'world',
    label: 'Dunia',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
  {
    id: 'agents',
    label: 'Agent',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tugas',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 12l2.5 2.5L16 9" />
      </svg>
    ),
  },
  {
    id: 'meetings',
    label: 'Rapat',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="9" cy="9" r="3" />
        <path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5S13.7 16 14.5 19" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M16 14.6c2.3.2 3.8 1.6 4.5 4.4" />
      </svg>
    ),
  },
  {
    id: 'events',
    label: 'Acara',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M4 10h16M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    id: 'builder',
    label: 'Bangun',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M14.5 4.5l5 5-2 2-5-5z" />
        <path d="M12 7L4 15l2 2 8-8" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analitik',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M5 20v-8M11 20V6M17 20v-11M3 20h18" />
      </svg>
    ),
  },
  {
    id: 'activity',
    label: 'Aktivitas',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 12h4l3-7 4 14 3-7h4" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Atur',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19" />
      </svg>
    ),
  },
];

interface Props {
  section: Section;
  onSelect: (section: Section) => void;
  /** Jumlah tugas terbuka — lencana kecil di item Tugas. */
  openTasks: number;
}

export function Sidebar({ section, onSelect, openTasks }: Props) {
  return (
    <nav className="nav-rail" aria-label="Bagian aplikasi">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={section === item.id ? 'nav-item active' : 'nav-item'}
          aria-current={section === item.id ? 'page' : undefined}
          onClick={() => onSelect(item.id)}
        >
          {item.icon}
          <span className="nav-label">{item.label}</span>
          {item.id === 'tasks' && openTasks > 0 && <span className="nav-count">{openTasks}</span>}
        </button>
      ))}
    </nav>
  );
}
