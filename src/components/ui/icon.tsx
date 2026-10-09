import {
  Activity,
  AlignVerticalJustifyStart,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BarChart3,
  Bell,
  Bookmark,
  BookmarkPlus,
  BookOpen,
  Calendar,
  CalendarDays,
  CalendarPlus,
  Camera,
  ChartLine,
  Check,
  CircleCheck,
  CirclePlay,
  CirclePlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CloudOff,
  CloudUpload,
  Disc3,
  Dumbbell,
  EllipsisVertical,
  ExternalLink,
  FileText,
  Flame,
  Gauge,
  GraduationCap,
  Guitar,
  Headphones,
  Heart,
  Layers,
  LayoutList,
  Library,
  Link,
  List,
  ListFilter,
  ListMusic,
  ListPlus,
  LoaderCircle,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquareQuote,
  Metronome,
  Monitor,
  Moon,
  Music,
  Newspaper,
  Pencil,
  Play,
  Plus,
  Quote,
  RefreshCw,
  Repeat,
  Reply,
  Search,
  SearchX,
  Send,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  SmilePlus,
  Sparkles,
  Star,
  Sun,
  Tag,
  ThumbsUp,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  UserPlus,
  UserSearch,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";

/**
 * Les anciens noms Material Symbols, servis par Lucide.
 *
 * La refonte (docs/refonte-ui.md) a remplace la police d'icones par
 * Lucide. Plusieurs composants recoivent encore un nom d'icone en
 * chaine — EmptyState, la palette cmd-K, les tiroirs de glissement — et
 * les noms historiques restent ceux de Material : cette table les traduit
 * sans toucher a chaque appelant. Un nom absent ne rend rien, plutot que
 * le nom en texte brut comme le faisait la police.
 */
const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  add: Plus,
  add_circle: CirclePlus,
  add_reaction: SmilePlus,
  album: Disc3,
  albums: Disc3,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  audiotrack: AudioLines,
  auto_awesome: Sparkles,
  bar_chart: BarChart3,
  bookmark: Bookmark,
  bookmark_add: BookmarkPlus,
  calendar_add_on: CalendarPlus,
  calendar_month: CalendarDays,
  calendar_today: Calendar,
  chart: ChartLine,
  chat_bubble_outline: MessageCircle,
  check: Check,
  check_circle: CircleCheck,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  cloud_off: CloudOff,
  cloud_upload: CloudUpload,
  computer: Monitor,
  dark_mode: Moon,
  delete: Trash2,
  description: FileText,
  edit: Pencil,
  emoji_events: Trophy,
  event: Calendar,
  exercise: Dumbbell,
  expand_less: ChevronUp,
  expand_more: ChevronDown,
  favorite: Heart,
  feed: Newspaper,
  filter_list: ListFilter,
  format_quote: Quote,
  gear: Guitar,
  group: Users,
  groups: Users,
  guitar: Guitar,
  headphones: Headphones,
  label: Tag,
  layers: Layers,
  leaderboard: BarChart3,
  library: Library,
  library_music: ListMusic,
  light_mode: Sun,
  link: Link,
  list: List,
  local_fire_department: Flame,
  location_on: MapPin,
  lock: Lock,
  menu_book: BookOpen,
  metronome: Metronome,
  more_vert: EllipsisVertical,
  music_note: Music,
  notifications: Bell,
  open_in_new: ExternalLink,
  person: User,
  person_add: UserPlus,
  person_search: UserSearch,
  photo_camera: Camera,
  play_arrow: Play,
  play_circle: CirclePlay,
  playlist_add: ListPlus,
  progress_activity: LoaderCircle,
  queue_music: ListMusic,
  rate_review: MessageSquareQuote,
  recommend: ThumbsUp,
  refresh: RefreshCw,
  repeat: Repeat,
  reply: Reply,
  schedule: Timer,
  school: GraduationCap,
  search: Search,
  search_off: SearchX,
  send: Send,
  setlist: LayoutList,
  settings: Settings,
  shopping_bag: ShoppingBag,
  social: MessageCircle,
  speed: Gauge,
  star: Star,
  stars: Sparkles,
  timer: Timer,
  trending_up: TrendingUp,
  trophy: Trophy,
  tune: SlidersHorizontal,
  tuner: Gauge,
  users: Users,
  vertical_align_top: AlignVerticalJustifyStart,
  video: Video,
  video_library: Video,
  videocam: Video,
};

interface IconProps {
  /** Nom historique (Material Symbols) ou nom de navigation. */
  name: string;
  className?: string;
  strokeWidth?: number;
  /** Plein, pour les etoiles et les coeurs « actifs ». */
  filled?: boolean;
}

export function Icon({ name, className = "h-5 w-5", strokeWidth = 1.75, filled = false }: IconProps) {
  const Component = ICONS[name];
  if (!Component) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Icon: pas d'equivalent Lucide pour « ${name} »`);
    }
    return null;
  }
  return (
    <Component
      className={`${filled ? "fill-current" : ""} ${className}`}
      strokeWidth={filled ? 0 : strokeWidth}
      aria-hidden="true"
    />
  );
}

/** Pour les composants qui veulent savoir si un nom est servi. */
export function hasIcon(name: string): boolean {
  return name in ICONS;
}
