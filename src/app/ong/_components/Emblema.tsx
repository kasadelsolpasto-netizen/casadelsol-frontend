/**
 * Emblema «Sol y cuenca».
 *
 * Un disco solar cuya mitad inferior se disuelve en curvas de nivel
 * hidrográficas: el sol sobre la cuenca. Es el motivo gráfico de la
 * Fundación. SVG puro, decorativo.
 */
export function Emblema({ className = "" }: { className?: string }) {
  const rayos = Array.from({ length: 36 }, (_, i) => i);
  // Curvas de nivel de la cuenca: radios crecientes bajo el horizonte
  const curvas = [96, 124, 152, 180, 208, 236, 264];

  return (
    <svg
      viewBox="0 0 440 440"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="ong-halo" cx="50%" cy="38%" r="52%">
          <stop offset="0%" stopColor="#e8b04b" stopOpacity="0.42" />
          <stop offset="58%" stopColor="#c98a2e" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#b8551f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ong-disc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8b04b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#b8551f" stopOpacity="0.25" />
        </linearGradient>
        {/* El agua se desvanece hacia los bordes */}
        <linearGradient id="ong-cuenca" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3bbda8" stopOpacity="0" />
          <stop offset="30%" stopColor="#3bbda8" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#1c7f74" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1c7f74" stopOpacity="0" />
        </linearGradient>
        {/* Recorta la cuenca por debajo de la línea de horizonte */}
        <clipPath id="ong-bajo-horizonte">
          <rect x="0" y="220" width="440" height="220" />
        </clipPath>
      </defs>

      {/* Halo solar */}
      <circle cx="220" cy="168" r="200" fill="url(#ong-halo)" />

      {/* Corona de rayos */}
      <g className="ong-rotate-slow" style={{ transformOrigin: "220px 168px" }}>
        {rayos.map((i) => {
          const largo = i % 3 === 0;
          return (
            <rect
              key={i}
              x="219.4"
              y={largo ? 26 : 38}
              width="1.2"
              height={largo ? 30 : 16}
              rx="0.6"
              fill="#e8b04b"
              opacity={largo ? 0.6 : 0.26}
              transform={`rotate(${i * 10} 220 168)`}
            />
          );
        })}
      </g>

      {/* Disco: anillo exterior y núcleo */}
      <circle
        cx="220"
        cy="168"
        r="104"
        fill="none"
        stroke="url(#ong-disc)"
        strokeWidth="1.25"
      />
      <circle
        cx="220"
        cy="168"
        r="76"
        fill="none"
        stroke="#e8b04b"
        strokeOpacity="0.18"
        strokeWidth="1"
      />
      <circle cx="220" cy="168" r="46" fill="url(#ong-halo)" className="ong-drift" />

      {/* Línea de horizonte */}
      <line
        x1="40"
        y1="220"
        x2="400"
        y2="220"
        stroke="#e8b04b"
        strokeOpacity="0.3"
        strokeWidth="1"
      />

      {/* La cuenca: curvas de nivel bajo el horizonte */}
      <g clipPath="url(#ong-bajo-horizonte)">
        {curvas.map((r, i) => (
          <circle
            key={r}
            cx="220"
            cy="220"
            r={r}
            fill="none"
            stroke="url(#ong-cuenca)"
            strokeWidth={i === 0 ? 1.4 : 1}
            opacity={1 - i * 0.1}
          />
        ))}
        {/* Cauce principal */}
        <path
          d="M220 220 C 214 268, 232 300, 222 338 C 214 372, 236 398, 228 440"
          fill="none"
          stroke="#3bbda8"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        {/* Afluentes */}
        <path
          d="M220 252 C 196 268, 178 286, 170 312"
          fill="none"
          stroke="#3bbda8"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
        <path
          d="M224 288 C 250 302, 268 322, 276 352"
          fill="none"
          stroke="#3bbda8"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}
