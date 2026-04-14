"use client";
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

// Rutas donde la navbar global NO debe aparecer:
// - /admin/* → tiene su propio sidebar
// - /login, /register → páginas fullscreen de auth
// - /scanner → interfaz de escáner fullscreen
const EXCLUDED_PREFIXES = ['/admin', '/login', '/register', '/scanner'];

export function NavbarWrapper() {
  const pathname = usePathname();
  const isExcluded = EXCLUDED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (isExcluded) return null;
  return <Navbar />;
}
