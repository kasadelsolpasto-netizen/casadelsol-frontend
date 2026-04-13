import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    // Conectamos directamente con el backend al endpoint de login general.
    // El backend tiene su propio interceptor .env que devuelve OWNER si coinciden las llaves.
    const backRes = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (backRes.ok) {
      const data = await backRes.json();
      
      // Verificamos si el backend lo reconoció como el dueño supremo
      if (data.user && data.user.role === 'OWNER') {
        return NextResponse.json({ success: true, user: data.user, token: data.access_token });
      } else {
        return NextResponse.json({ success: false, message: 'Perfil correcto, pero NO eres el owner.' }, { status: 403 });
      }
    }

    return NextResponse.json({ success: false, message: 'Credenciales de Supremo Inválidas en Backend' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Error interno de validación' }, { status: 500 });
  }
}
