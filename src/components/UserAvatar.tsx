import { 
  Skull, Ghost, Flame, Eye, Zap, 
  Radiation, Moon, Sun, CloudLightning, Activity, User
} from 'lucide-react';

export const AVATAR_OPTIONS = [
  { id: 'skull', icon: Skull, label: 'Cráneo' },
  { id: 'ghost', icon: Ghost, label: 'Fantasma' },
  { id: 'flame', icon: Flame, label: 'Fuego' },
  { id: 'eye', icon: Eye, label: 'Ojo Místico' },
  { id: 'zap', icon: Zap, label: 'Rayo' },
  { id: 'radiation', icon: Radiation, label: 'Radiactivo' },
  { id: 'moon', icon: Moon, label: 'Luna' },
  { id: 'sun', icon: Sun, label: 'Sol' },
  { id: 'cloud-lightning', icon: CloudLightning, label: 'Tormenta' },
  { id: 'activity', icon: Activity, label: 'Pulso' },
];

export function UserAvatar({ avatarId, className = "w-6 h-6", iconClassName = "w-3 h-3 text-zinc-400" }: { avatarId?: string | null, className?: string, iconClassName?: string }) {
  if (!avatarId) {
    return (
      <div className={`rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-700 ${className}`}>
        <User className={iconClassName} />
      </div>
    );
  }

  const option = AVATAR_OPTIONS.find(opt => opt.id === avatarId);
  const Icon = option ? option.icon : User;

  return (
    <div className={`rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-950 flex items-center justify-center overflow-hidden border border-zinc-700 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] ${className}`}>
      <Icon className={iconClassName} />
    </div>
  );
}
