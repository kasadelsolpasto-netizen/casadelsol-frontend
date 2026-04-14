"use client";
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function AdminLogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('kasa_user');
    document.cookie = 'kasa_auth_token=; path=/; max-age=0;';
    router.push('/admin/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-3 px-4 py-3 w-full text-zinc-500 hover:text-red-500 hover:bg-red-500/5 rounded-lg tracking-wider text-sm transition-all group"
    >
      <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
      Cerrar Sesión
    </button>
  );
}
