'use client';

import { cn } from '@/lib/utils';

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function DonutChart({ segments, size = 80, strokeWidth = 12, className }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const startAngle = (cumulative / total) * 360;
    cumulative += seg.value;
    const endAngle = (cumulative / total) * 360;
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const d =
      seg.value === 0
        ? ''
        : seg.value === total
          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`
          : `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

    return { d, color: seg.color, label: seg.label, value: seg.value, percent: total > 0 ? (seg.value / total) * 100 : 0 };
  });

  if (total === 0) {
    return (
      <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        </svg>
        <span className="absolute text-xs font-semibold text-gray-400">0</span>
      </div>
    );
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        {arcs.map((arc, i) =>
          arc.d ? <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={strokeWidth} strokeLinecap="butt" /> : null
        )}
      </svg>
      <span className="absolute text-xs font-semibold text-gray-700 dark:text-gray-300">{total}</span>
    </div>
  );
}

export function DonutLegend({ segments }: { segments: DonutSegment[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {segments.map((seg, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
          <span>{seg.label}: {seg.value}</span>
        </div>
      ))}
    </div>
  );
}
