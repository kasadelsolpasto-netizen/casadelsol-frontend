import {
  Sun,
  Heart,
  Music,
  BookOpen,
  Sprout,
  Users,
  Scale,
  Megaphone,
  Sparkles,
  Globe,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "../content";

/** Mapa único de claves de contenido a iconos. content.ts no importa JSX. */
export const ICONS: Record<IconKey, LucideIcon> = {
  sun: Sun,
  heart: Heart,
  music: Music,
  book: BookOpen,
  sprout: Sprout,
  users: Users,
  scale: Scale,
  megaphone: Megaphone,
  sparkles: Sparkles,
  globe: Globe,
};

export function OngIcon({
  name,
  className = "w-6 h-6",
}: {
  name: IconKey;
  className?: string;
}) {
  const Cmp = ICONS[name] ?? Sun;
  return <Cmp className={className} aria-hidden="true" />;
}
