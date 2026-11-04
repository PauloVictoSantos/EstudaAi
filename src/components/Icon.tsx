import {
  Activity, ArrowRight, BookOpen, Brain, Calendar, ChartLine, Check, ChevronLeft, CircleAlert, CircleCheck, CircleHelp, Circle, ClipboardList, CloudOff,
  Coffee, Crosshair, Dice5, Download, Eye, EyeOff, FileText, Flame, Footprints, GraduationCap, Hourglass, Info, Landmark, Lightbulb, ListChecks,
  LogOut, Moon, NotebookPen, PartyPopper, PenLine, Pencil, Play, RefreshCw, RotateCcw, RotateCw, Route, Save, School, Shuffle, SkipForward, Snowflake,
  Sparkles, Sun, Target, Timer, Trophy, WandSparkles, Wifi, WifiOff, X, type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  activity: Activity, 'arrow-right': ArrowRight, 'book-open': BookOpen, brain: Brain, calendar: Calendar, 'chart-line': ChartLine, check: Check,
  'chevron-left': ChevronLeft, 'circle-alert': CircleAlert, 'circle-check': CircleCheck, 'circle-help': CircleHelp, circle: Circle, 'clipboard-list': ClipboardList,
  'cloud-off': CloudOff, coffee: Coffee, crosshair: Crosshair, 'dice-5': Dice5, download: Download, eye: Eye, 'eye-off': EyeOff, 'file-text': FileText,
  flame: Flame, footprints: Footprints, 'graduation-cap': GraduationCap, hourglass: Hourglass, info: Info, landmark: Landmark, lightbulb: Lightbulb,
  'list-checks': ListChecks, 'log-out': LogOut, moon: Moon, 'notebook-pen': NotebookPen, 'party-popper': PartyPopper, 'pen-line': PenLine, pencil: Pencil,
  play: Play, 'refresh-cw': RefreshCw, 'rotate-ccw': RotateCcw, 'rotate-cw': RotateCw, route: Route, save: Save, school: School, shuffle: Shuffle,
  'skip-forward': SkipForward, snowflake: Snowflake, sparkles: Sparkles, sun: Sun, target: Target, timer: Timer, trophy: Trophy,
  'wand-sparkles': WandSparkles, wifi: Wifi, 'wifi-off': WifiOff, x: X,
};

export function Icon({ name, size = 18, style, className }: { name: string; size?: number; style?: React.CSSProperties; className?: string }) {
  const C = ICONS[name] ?? Circle;
  return <C aria-hidden size={size} style={{ flex: 'none', ...style }} className={className} />;
}
