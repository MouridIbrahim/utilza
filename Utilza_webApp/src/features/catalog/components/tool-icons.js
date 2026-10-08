import {
  AlignLeft, Archive, ArchiveRestore, ArrowLeftRight, ArrowUpDown, Braces,
  Calculator, Cake, CalendarClock, CalendarDays, CaseSensitive, Combine, Code,
  Contrast, Copy, Crop, Droplets, EyeOff, FileArchive, FileCode, FileCode2,
  FileText, FileType, Files, FlipHorizontal2, Globe, Hash, Heading, IdCard, Image,
  Info, KeyRound, Layers, LayoutDashboard, Link, ListOrdered, Lock, PackageOpen,
  PenLine, PenTool, Pencil, Percent, QrCode, RotateCw, Ruler, Scaling, ScrollText,
  Search, Share2, Sheet, ShieldCheck, Shrink, SlidersHorizontal, Sparkles,
  Split, Stamp, Star, Sun, Table, Tag, Trash2, Type, Wrench, Zap, Boxes,
} from 'lucide-react';

// Backend `icon` string -> Lucide component. Mirrors design-system/ICON_MAP.md.
// Unknown keys fall back to the tool's category icon (see getToolIcon).
const TOOL_ICONS = {
  percent: Percent,
  tag: Tag,
  cake: Cake,
  calendar: CalendarDays,
  ruler: Ruler,
  type: Type,
  text: AlignLeft,
  case: CaseSensitive,
  key: KeyRound,
  qr: QrCode,
  merge: Combine,
  split: Split,
  compress: Shrink,
  word: FileType,
  convert: ArrowLeftRight,
  pdf: FileText,
  txt: ScrollText,
  html: FileCode,
  markdown: FileCode2,
  csv: Table,
  json: Braces,
  excel: Sheet,
  info: Info,
  resize: Scaling,
  crop: Crop,
  rotate: RotateCw,
  flip: FlipHorizontal2,
  zip: FileArchive,
  unzip: PackageOpen,
  hash: Hash,
  code: Code,
  grayscale: Contrast,
  blur: Droplets,
  sharpen: Zap,
  brightness: Sun,
  contrast: SlidersHorizontal,
  search: Search,
  pixelate: Boxes,
  watermark: Stamp,
  link: Link,
  dns: Globe,
  lock: Lock,
  redact: EyeOff,
  social: Share2,
  id: IdCard,
  rename: PenLine,
  archive: Archive,
  unarchive: ArchiveRestore,
  image: Image,
  sign: PenTool,
  edit: Pencil,
  privacy: ShieldCheck,
  star: Star,
  grid: LayoutDashboard,
  trash: Trash2,
  number: ListOrdered,
  header: Heading,
  reorder: ArrowUpDown,
  copy: Copy,
  flatten: Layers,
};

export const CATEGORY_ICONS = {
  calculators: Calculator,
  'date-time': CalendarClock,
  text: Type,
  generators: Sparkles,
  pdf: FileText,
  image: Image,
  documents: Files,
  file: Archive,
  url: Link,
};

export function getToolIcon(iconKey, categorySlug) {
  if (iconKey && TOOL_ICONS[iconKey]) return TOOL_ICONS[iconKey];
  if (categorySlug && CATEGORY_ICONS[categorySlug]) return CATEGORY_ICONS[categorySlug];
  return Wrench;
}

export function getCategoryIcon(categorySlug) {
  return CATEGORY_ICONS[categorySlug] || Wrench;
}
