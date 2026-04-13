import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get('kasa_auth_token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const payloadBase64Url = token.split('.')[1];
      // Adaptar Base64Url a Base64 estándar para el motor Edge (atob)
      let base64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      if (pad) {
        base64 += '='.repeat(4 - pad);
      }
      
      const payloadString = atob(base64);
      // Decodificar caracteres especiales
      const payload = JSON.parse(decodeURIComponent(escape(payloadString)));
      
      // Solo OWNER puede entrar a las rutas /admin en general
      if (request.nextUrl.pathname.startsWith('/admin') && payload.role !== 'OWNER') {
         return NextResponse.redirect(new URL('/', request.url));
      }

      // Validar acceso exclusivo al /scanner para el STAFF o OWNER
      if (request.nextUrl.pathname.startsWith('/scanner')) {
         if (payload.role !== 'STAFF' && payload.role !== 'OWNER') {
            return NextResponse.redirect(new URL('/', request.url));
         }
      }
      
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Comprobar la protección de scanner ahora que esta separado
  if (request.nextUrl.pathname.startsWith('/scanner')) {
    const token = request.cookies.get('kasa_auth_token')?.value;
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    try {
      const pBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadString = atob(pBase64 + '='.repeat((4 - pBase64.length % 4) % 4));
      const payload = JSON.parse(decodeURIComponent(escape(payloadString)));
      if (payload.role !== 'STAFF' && payload.role !== 'OWNER') {
         return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/scanner', '/scanner/:path*'],
};
