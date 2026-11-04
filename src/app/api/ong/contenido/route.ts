/**
 * API del contenido de la Fundación.
 *
 *   GET  → documento compuesto (base + lo guardado). Público: es lo mismo que
 *          ya se ve en /ong.
 *   PUT  → reemplaza el documento. Solo OWNER.
 *
 * ── Cómo se autoriza la escritura ─────────────────────────────────────────
 * El frontend no puede validar por sí mismo el JWT que emite el backend
 * (no tiene el secreto de firma). Así que se le pregunta al backend: se
 * reenvía el token a un endpoint que el backend solo responde a un
 * administrador. Si contesta 2xx, quien llama es OWNER; si contesta 401/403,
 * no lo es. Un token falsificado falla la verificación de firma en el backend
 * y nunca llega a 2xx.
 *
 * El endpoint usado como oráculo se puede cambiar con la variable de entorno
 * ONG_ENDPOINT_VERIFICACION sin tocar este archivo.
 */
import { NextResponse } from "next/server";
import { obtener, guardar, almacenConfigurado } from "@/lib/ong-almacen";
import { componer } from "@/lib/ong-contenido";
import { CONTENIDO_BASE, type ContenidoOng } from "@/app/ong/contenido";

export const dynamic = "force-dynamic";

const API_BACKEND =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Endpoint del backend que solo responde a un administrador. */
const ENDPOINT_VERIFICACION =
  process.env.ONG_ENDPOINT_VERIFICACION || "/admin/settings/wompi";

function tokenDe(request: Request): string | null {
  const cabecera = request.headers.get("authorization");
  if (cabecera?.startsWith("Bearer ")) return cabecera.slice(7).trim() || null;
  const cookie = request.headers.get("cookie") || "";
  const fila = cookie
    .split("; ")
    .find((c) => c.startsWith("kasa_auth_token="));
  return fila ? fila.split("=")[1] : null;
}

async function esOwner(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BACKEND}${ENDPOINT_VERIFICACION}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const guardado = await obtener();
  return NextResponse.json({
    contenido: componer(guardado?.documento),
    almacenConfigurado: almacenConfigurado(),
    actualizadoEn: guardado?.actualizadoEn ?? null,
    actualizadoPor: guardado?.actualizadoPor ?? null,
  });
}

export async function PUT(request: Request) {
  const token = tokenDe(request);
  if (!token) {
    return NextResponse.json(
      { mensaje: "Falta la sesión. Vuelve a iniciar sesión en el panel." },
      { status: 401 },
    );
  }
  if (!(await esOwner(token))) {
    return NextResponse.json(
      { mensaje: "No tienes permiso para editar el contenido de la Fundación." },
      { status: 403 },
    );
  }
  if (!almacenConfigurado()) {
    return NextResponse.json(
      {
        mensaje:
          "El almacén no está configurado. Falta ejecutar supabase/ong_contenido.sql y definir SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ mensaje: "Cuerpo inválido." }, { status: 400 });
  }

  const entrante = (cuerpo as { contenido?: unknown })?.contenido;
  if (typeof entrante !== "object" || entrante === null) {
    return NextResponse.json(
      { mensaje: "Falta el documento a guardar." },
      { status: 400 },
    );
  }

  // Se normaliza contra la base: nunca se almacena una forma que la página no
  // sepa renderizar, ni campos ajenos al documento.
  const documento: ContenidoOng = componer(entrante);
  // Las claves desconocidas se descartan al componer sobre CONTENIDO_BASE.
  void CONTENIDO_BASE;

  try {
    await guardar(documento, (cuerpo as { autor?: string })?.autor || "admin");
  } catch (e) {
    return NextResponse.json(
      { mensaje: e instanceof Error ? e.message : "No se pudo guardar." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, contenido: documento });
}
