import {
  ChartLine,
  Disc3,
  Dumbbell,
  EllipsisVertical,
  Gauge,
  Guitar,
  LayoutDashboard,
  Library,
  ListMusic,
  MessageCircle,
  Metronome,
  Mic,
  Music,
  Newspaper,
  Search,
  Settings,
  Trophy,
  User,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";

/*
 * Les icones de navigation passent par Lucide (cf. docs/refonte-ui.md) :
 * un trait fin et regulier, sans la pastille arrondie qui signait les
 * icones Material Symbols. Les noms restent ceux de navigation.ts pour
 * ne rien changer chez les appelants.
 */
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  library: Library,
  chart: ChartLine,
  video: Video,
  users: Users,
  feed: Newspaper,
  setlist: ListMusic,
  trophy: Trophy,
  metronome: Metronome,
  audio: Mic,
  music_collection: Music,
  training: Zap,
  social: MessageCircle,
  album: Disc3,
  guitar: Guitar,
  person: User,
  settings: Settings,
  exercise: Dumbbell,
  tuner: Gauge,
  search: Search,
  more: EllipsisVertical,
};

export function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon];
  if (!Icon) return null;

  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}
