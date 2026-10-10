interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  unit?: string;
}

export function BarChart({ data, height = 200, unit = 'kg' }: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d, i) => {
        const barHeight = maxVal > 0 ? (d.value / maxVal) * (height - 30) : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end">
            <div className="text-xs font-medium text-gray-600 mb-1">{d.value > 0 ? d.value.toFixed(1) : ''}</div>
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${d.color || 'bg-teal-500'}`}
              style={{ height: `${barHeight}px`, minHeight: d.value > 0 ? '4px' : '0' }}
            />
            <div className="text-xs text-gray-500 mt-2 text-center truncate w-full">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}
