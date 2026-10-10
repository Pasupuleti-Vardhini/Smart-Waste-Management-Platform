interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  unit?: string;
}

export function DonutChart({ data, size = 180, unit = 'kg' }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2 - 20;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-gray-400 text-sm py-8">No data available</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          {data.map((d, i) => {
            const pct = d.value / total;
            const dash = pct * circumference;
            const circle = (
              <circle
                key={i}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth="20"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return circle;
          })}
        </g>
        <text x={size / 2} y={size / 2 - 5} textAnchor="middle" className="text-lg font-bold fill-gray-900">
          {total.toFixed(1)}
        </text>
        <text x={size / 2} y={size / 2 + 15} textAnchor="middle" className="text-xs fill-gray-400">
          {unit}
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${d.color}`} />
            <span className="text-gray-600">{d.label}</span>
            <span className="font-medium text-gray-900">{d.value.toFixed(1)} {unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
