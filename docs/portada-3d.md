# Portada 3D reactiva — notas de traspaso

Rama: `feat/portada-rave-underground` · Estado: lista para PR hacia `master`.

## Qué es

Portada de Kasa del Sol con escena 3D en WebGL que reacciona al cursor (o a la inclinación
del teléfono) y a música generada en vivo en el navegador. Conserva la estética neón del sitio
(verde `#39ff14`, morado `#bf00ff`, tipografía Outfit) con acentos tekno en JetBrains Mono.

- **Música** (`src/lib/rave-engine.ts`): 128 BPM. Línea acid (el puntero controla el filtro:
  X = corte, Y = resonancia) sobre percusión tribal con groove: bombo 4/4, shaker con swing,
  rim en tresillo 3-3-2, toms en ciclo de 7, congas en ciclo de 12, surdo y redoble cada
  8 compases. Suena solo cuando el visitante pulsa el botón (regla de autoplay de los navegadores).
- **Escena** (`src/components/home/RaveScene.tsx`), en la línea de chauss.cz, en tres capas:
  1. **Cielo** (WebGL): cosmos, constelación de Orión tal como se vio desde Pasto al amanecer del
     30 de junio de 1988 (acostada, cabeza al norte; solo estrellas, tabla `ORION`) y el **sol por
     delante** de ella, a la izquierda.
  2. **Valle vectorial** (`scene/valley.ts`, Canvas 2D a resolución nativa: trazos nítidos, sin
     pixelado): al centro una **calle de ciudad "trash"** (pavimento roto e irregular, construcciones
     bajas y torcidas con tanques, antenas, cables y ventanas de neón, que se desvanecen al acercarse),
     en contraste con el **relieve natural**: montañas exageradas a los lados recorridas por
     **caminos**, el horizonte y el **volcán Galeras** al fondo, con cumbre truncada y cráter. No
     representa una carretera.
     Encima, el **ecualizador como rayo y haz de luz** que cruza toda la página con la forma de onda
     real del sonido.
  3. **Fuego** (`scene/fire.ts`, WebGL con transparencia): llamas en el borde inferior, de lado a
     lado, como si brotaran de quien mira (cámara subjetiva). Contraste deliberado de calidades: el
     cuerpo de las llamas es liso y "perfecto" (plástico líquido con volumen, brillo especular e
     iridiscencia psicodélica, a alta resolución) y el pixelado es recurso expresivo (halo de píxeles
     nítidos alrededor y brasas en píxeles que suben). Liviano: solo ondas, sin ruido costoso.
- **Recorrido**: quien mira no avanza por una vía recta. La cámara (`valleyCamera`) serpentea,
  cruza el barrio y sus calles transversales, sale al monte subiendo con el terreno y vuelve a bajar;
  la mirada gira hacia donde avanza y el cielo y el volcán giran con ella.
- **Ritmo visual**: delicado, nunca más rápido que la mitad del tempo (la cámara avanza una fila de la
  calle por compás, el sol respira cada 2 negras, un anillo por compás, titileo cada 2 compases,
  las llamas suben despacio). **Excepción**: el ecualizador dibuja fielmente la forma de onda en
  tiempo real; en silencio es una línea quieta.
- **Rendimiento**: el cielo usa resolución interna adaptativa; el valle es vectorial y ligero.
- **Flyer**: esquinas **cúbicas en 3D** (escuadras con volumen hechas de capas en profundidad) que
  se levantan un poco fuera del recuadro, como una tapa, y respiran a medio tempo.
- **Título**: gira con el cursor, no con la música; borde luminoso suave a medio tempo.
- **Flyer y tarjetas**: inclinación 3D con el cursor (`TiltFlyer.tsx`, `TiltCard.tsx`).
- Sin WebGL se muestra un fondo neón estático; con "reducir movimiento" la animación se detiene.

## Textos editables (panel del Supremo)

`Configuración → Portada` en `/admin/settings`. El catálogo de campos y sus valores por defecto
está en `src/lib/home-texts.ts` (fuente única para la portada y para el formulario).

Se guardan con `PUT /admin/settings/brand` dentro del campo **`homeTexts`** (solo los valores
que difieren del defecto), junto con `homeTitle` y `homeDescription` que ya existían.

### ⚠️ Pendiente: confirmar el backend (`kasa-backend`)

No se pudo revisar el backend. Antes o justo después de publicar:

1. Verificar que `PUT /admin/settings/brand` acepte y guarde el campo `homeTexts` (objeto de
   strings) y que `GET /settings/brand` lo devuelva.
2. Si el DTO filtra campos (p. ej. `whitelist` / `forbidNonWhitelisted` de class-validator),
   agregar `homeTexts` al DTO de marca.

El panel ya lo detecta: al guardar, vuelve a leer la marca y muestra un error explícito si el
servidor no conservó los textos. Mientras tanto la portada usa los textos por defecto.

## Archivos tocados

- `src/app/page.tsx` — portada
- `src/app/globals.css` — bloque "PORTADA RAVE 3D" al final
- `src/app/admin/settings/page.tsx` — pestaña "Portada"
- `src/components/home/` — `RaveScene`, `SoundDeck`, `TiltFlyer`, `TiltCard`, `Countdown`
- `src/lib/rave-engine.ts`, `src/lib/home-texts.ts`

Sin dependencias nuevas.

## Verificación hecha

- `tsc` sin errores en los archivos nuevos; `next lint` limpio en `src/components/home` y `src/lib`.
- `next build` correcto. Requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  definidas (dos páginas del admin ya existentes fallan al prerenderizar sin ellas).
- Probado con backend simulado: edición en el panel → guardado → la portada muestra el texto nuevo.
- Escritorio 1440×900 y iPhone 13 sin desborde horizontal.

## Para publicar

1. Abrir PR `feat/portada-rave-underground` → `master` y revisar la vista previa del despliegue.
2. Confirmar el punto pendiente del backend.
3. Probar el sonido y la inclinación en un iPhone real (Safari pide permiso al pulsar el botón).
