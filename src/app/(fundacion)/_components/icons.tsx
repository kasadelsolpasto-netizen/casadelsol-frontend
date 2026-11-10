import {
  Sun,
  Droplets,
  Leaf,
  Scale,
  ShieldCheck,
  Search,
  Users,
  GraduationCap,
  Music,
  FlaskConical,
  Handshake,
  Globe,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "../contenido";

/** Mapa único de claves de contenido a iconos; content.ts no importa JSX. */
export const ICONS: Record<IconKey, LucideIcon> = {
  sol: Sun,
  agua: Droplets,
  hoja: Leaf,
  balanza: Scale,
  escudo: ShieldCheck,
  lupa: Search,
  comunidad: Users,
  formacion: GraduationCap,
  cultura: Music,
  laboratorio: FlaskConical,
  convenio: Handshake,
  globo: Globe,
};

export function OngIcon({
  name,
  className = "w-5 h-5",
}: {
  name: IconKey;
  className?: string;
}) {
  const Cmp = ICONS[name] ?? Sun;
  return <Cmp className={className} aria-hidden="true" />;
}
