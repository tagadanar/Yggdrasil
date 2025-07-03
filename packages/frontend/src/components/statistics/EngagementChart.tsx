// packages/frontend/src/components/statistics/EngagementChart.tsx

'use client';

interface EngagementChartProps {
  data: Array<{ activity: string; score: number }>;
}

export function EngagementChart({ data }: EngagementChartProps) {
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              {item.activity}
            </span>
            <span className="text-sm text-gray-600">
              {item.score}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                item.score >= 80 ? 'bg-green-500' :
                item.score >= 60 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${item.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}