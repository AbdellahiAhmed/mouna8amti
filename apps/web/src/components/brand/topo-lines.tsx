// Topographic contour texture from the validated design: one organic ring repeated at
// growing scale and rotation. Decorative only; used on brand surfaces (login, hero cards).
const RING = "M0-100C58-102 104-58 102-4C100 52 62 96 4 99C-56 102-104 60-103 2C-102-54-60-98 0-100Z";

type Cluster = { x: number; y: number; rings: number; start?: number; step?: number; spin?: number };

export function TopoLines({
  className,
  clusters = [{ x: 1210, y: 150, rings: 12 }, { x: 200, y: 800, rings: 10, spin: -8 }],
  viewBox = "0 0 1440 900",
  opacity = 0.075,
}: {
  className?: string;
  clusters?: Cluster[];
  viewBox?: string;
  opacity?: number;
}) {
  return (
    <svg className={className} viewBox={viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {clusters.map((c, ci) => (
        <g key={ci} transform={`translate(${c.x} ${c.y})`}>
          {Array.from({ length: c.rings }, (_, i) => (
            <path
              key={i}
              d={RING}
              transform={`rotate(${i * (c.spin ?? 7)}) scale(${(c.start ?? 0.35) + i * (c.step ?? 0.4) + i * i * 0.012})`}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={opacity}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
