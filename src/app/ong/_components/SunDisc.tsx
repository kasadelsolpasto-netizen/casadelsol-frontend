/**
 * Disco solar — motivo gráfico de la fundación.
 * SVG puro, sin dependencias, decorativo (aria-hidden).
 */
export function SunDisc({ className = "" }: { className?: string }) {
  const rays = Array.from({ length: 48 }, (_, i) => i);

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="ong-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffc53d" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#ff9b1a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ff5f1f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ong-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffc53d" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#ff5f1f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffc53d" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Halo */}
      <circle cx="200" cy="200" r="190" fill="url(#ong-core)" />

      {/* Corona de rayos */}
      <g className="ong-rotate-slow">
        {rays.map((i) => {
          const long = i % 4 === 0;
          return (
            <rect
              key={i}
              x="199.2"
              y={long ? 18 : 30}
              width="1.6"
              height={long ? 34 : 18}
              rx="0.8"
              fill="#ffc53d"
              opacity={long ? 0.7 : 0.3}
              transform={`rotate(${i * 7.5} 200 200)`}
            />
          );
        })}
      </g>

      {/* Anillos concéntricos */}
      <circle
        cx="200"
        cy="200"
        r="150"
        fill="none"
        stroke="url(#ong-ring)"
        strokeWidth="1"
      />
      <circle
        cx="200"
        cy="200"
        r="118"
        fill="none"
        stroke="#ffc53d"
        strokeOpacity="0.12"
        strokeWidth="1"
      />

      {/* Núcleo */}
      <circle cx="200" cy="200" r="86" fill="#070402" />
      <circle
        cx="200"
        cy="200"
        r="86"
        fill="none"
        stroke="#ff9b1a"
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      <circle
        cx="200"
        cy="200"
        r="58"
        fill="url(#ong-core)"
        className="ong-breathe"
      />
    </svg>
  );
}
