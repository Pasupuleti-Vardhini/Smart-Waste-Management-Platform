interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  unit?: string;
}

export function LineChart({ data, height = 200, color = '#0d9488', unit = 'kg' }: LineChartProps) {
  if (data.length === 0) return <div className="text-center text-gray-400 py-8 text-sm">No data</div>;

  const width = 600;
  const padding = 40;
  const chartHeight = height - padding;
  const chartWidth = width - padding;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  const points = data.map((d, i) => {
    const x = padding / 2 + i * stepX;
    const y = chartHeight - (d.value / maxVal) * (chartHeight - 20) + 10;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: '300px' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#lineGrad)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill={color} />
            <text x={p.x} y={height - 5} textAnchor="middle" className="text-[10px] fill-gray-400">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
