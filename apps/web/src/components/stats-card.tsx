import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: React.ReactNode;
}

export function StatsCard({ label, value, trend, icon }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-400">{label}</span>
        {icon && <span className="text-gray-500">{icon}</span>}
      </div>
      <div className="mt-3 flex items-end gap-3">
        <span className="text-3xl font-bold text-white">{value}</span>
        {trend && (
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.direction === 'up' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}
