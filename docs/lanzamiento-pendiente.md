# Lanzamiento pendiente — instructivo para retomarlo

Estado al 17 de noviembre de 2026. Este documento permite que otra sesión termine el lanzamiento sin releer la
conversación anterior. Cuando el lanzamiento quede verificado, borrar este archivo.

## 1. Dónde quedó todo

| Pieza | Estado |
|---|---|
| Backend `kasadelsolpasto-netizen/kasa-backend` | Fusionado en `master` (PR #1, commit de fusión `8880b83`). **Render no lo ha desplegado**: producción sigue sirviendo la versión anterior. |
| Frontend `kasadelsolpasto-netizen/casadelsol-frontend` | PR #1 **abierto, sin fusionar** (`claude/nifty-lovelace-8pf8qo` → `master`). La compilación de vista previa de Vercel pasó. |
| Producción | Sin cambios. Sitio sano. |

Render **no despliega solo** al fusionar en `master`: el despliegue del backend se hace a mano desde el panel de
Render. El frontend se aloja en Vercel (proyecto `casadelsol-frontend`, equipo `kasadelsolpasto-netizens-projects`).

## 2. Orden obligatorio

**Primero backend, después frontend.** El frontend nuevo usa rutas que solo existen en el backend nuevo
(aceptar contrato, contrato al programar). Con el backend viejo esas dos funciones fallan; lo demás funciona.

## 3. Paso 1 — Desplegar el backend (manual, lo hace el dueño en Render)

1. En Render, servicio del backend → *Manual Deploy* → *Deploy latest commit* de la rama `master`.
2. El comando de construcción (`npm run build`) ejecuta `prisma db push`. Solo agrega dos columnas opcionales:
   `Post.signature` y `ArtistContract.sign_method`. No modifica ni borra datos.
3. Si la construcción falla, Render conserva la versión anterior en servicio. Copiar el error del registro y
   resolverlo antes de seguir; **no** fusionar el frontend.

### Cómo comprobar que el backend nuevo está activo

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://casadelsol-backend.onrender.com/artists/me/contracts/x/accept
```

- `401` → backend nuevo activo (la ruta existe y pide sesión).
- `404` → sigue la versión anterior.

Segunda comprobación: en la respuesta de `GET /posts?limit=1` cada publicación ya **no** trae `author` ni
`author_id`, y sí trae `signature`.

Comprobación de salud (todas deben responder 200): `/health`, `/events`, `/artists/public`, `/settings/brand`,
`/settings/ong`, `/shop/products/catalog`.

## 4. Paso 2 — Lanzar el frontend

Solo con el paso 1 comprobado:

1. Fusionar el PR #1 de `casadelsol-frontend` en `master` (fusión normal; la rama parte limpia de `master`).
2. Esperar la compilación de producción de Vercel.
3. Comprobar en el sitio real (sección 5).

**Punto no resuelto:** antes de este trabajo, producción mostraba un frontend más adelantado que `master`
(equivalente a la rama `claude/brave-ride-xcoap5`). No se pudo confirmar desde el repositorio qué rama usa Vercel
como producción. Si tras fusionar en `master` el sitio real no cambia en unos minutos, el dueño debe revisar en
Vercel → *Settings → Git → Production Branch*, o promover a producción el despliegue de `master`
(*Deployments → ⋯ → Promote to Production*). No hay acceso a Vercel desde las sesiones de Claude.

## 5. Verificación en el sitio real (kasadelsol.co)

Sin iniciar sesión:

- [ ] `/artistas` responde 200 (antes daba 404) y aparece «Artistas» en la barra.
- [ ] `/guia-rut` muestra el instructivo con los botones de la DIAN.
- [ ] Inicio: las imágenes se ven sin trama de líneas encima.
- [ ] `/posts`: los resúmenes se ven con formato, sin etiquetas `<p>` ni `<a href…>` a la vista.
- [ ] Una publicación abierta no muestra autor automático (solo firma si se escribió).
- [ ] `/ong`: no hay ningún enlace hacia el sitio de raves.

Con sesión de dueño:

- [ ] Panel → Publicaciones → nueva: existe el campo «Firma»; un borrador se puede abrir para editar.
- [ ] Panel → Artistas → ficha de un artista: sección «Contratos» y, al agregar a un evento, selector
      «Sin contrato / Plantilla / Texto propio».
- [ ] «Plantilla y organización»: llenar razón social, NIT, representante legal y su documento. **Sin esto ningún
      contrato se puede enviar** (queda como borrador y el panel dice qué falta).

Con sesión de un artista de prueba:

- [ ] Al abrir `/profile/artist` sale el aviso de documentos (RUT, cédula, certificación bancaria a
      `artistas@kasadelsol.co`).
- [ ] «Mi página»: subir imagen, agregar enlaces y una grabación con enlace de YouTube o SoundCloud; publicar la
      página y ver que el reproductor suena en `/artistas/<nombre>`.
- [ ] Con un contrato enviado: «Leer y aceptar» → «Acepto el contrato»; llega copia al correo.
- [ ] En un evento con cachet: «Cuenta de cobro» abre el correo ya dirigido a la Fundación.

Con sesión de un socio que no sea promotor:

- [ ] Aparece la pestaña «Socio» y `/profile/socio` abre su área.

## 6. Si algo sale mal

- **Frontend:** en Vercel, *Deployments* → elegir el despliegue anterior → *Promote to Production* (vuelta atrás
  inmediata). No requiere tocar el backend: el backend nuevo es compatible con el frontend anterior.
- **Backend:** en Render, *Rollback* al despliegue anterior. Las dos columnas nuevas pueden quedarse: son
  opcionales y el código anterior las ignora.

## 7. Qué no se probó contra producción

Se verificó con pruebas automáticas (backend 583, frontend 185) y recorridos en pantalla con datos simulados. No se
pudo probar contra el backend real: panel de contratos del administrador, envío de correos, subida de imágenes a
Supabase y reproducción efectiva de YouTube/SoundCloud. Son los puntos a mirar primero en la sección 5.

## 8. Próximos ajustes (no aplicados a propósito)

1. **Definir `JWT_SECRET` en Render.** Mientras falte, las sesiones se firman con una clave conocida. Al definirla,
   todos inician sesión de nuevo una vez: hacerlo en un momento sin evento.
2. **Llave maestra del dueño:** las credenciales del entorno siguen dando acceso de dueño aunque se cambie la
   contraseña en el panel. Cerrarlo exige revisar antes la cuenta del dueño en la base de datos.
3. **Webhook de Bold:** confirmar el pago con Bold antes de liquidar (cambia los tiempos de respuesta del cobro).
4. **Depósitos de Supabase** (`posts`, `flyers`): aceptan subidas anónimas.
5. **Actualizaciones de Next, React y Tiptap:** no aplicadas por instrucción del dueño.
6. **Cartel de artistas** dentro de la página de cada evento: pendiente.
