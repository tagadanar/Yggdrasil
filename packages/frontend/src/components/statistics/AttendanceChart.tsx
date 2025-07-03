// packages/frontend/src/components/statistics/AttendanceChart.tsx

'use client';

interface AttendanceChartProps {
  data: Array<{ date: string; rate: number }>;
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  const maxRate = Math.max(...data.map(d => d.rate));
  const minRate = Math.min(...data.map(d => d.rate));
  const range = maxRate - minRate || 1;

  return (
    <div className="space-y-4">
      <div className="h-64 flex items-end justify-between space-x-2">
        {data.map((item, index) => {
          const height = ((item.rate - minRate) / range) * 200 + 20;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="relative group">
                <div
                  className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-t cursor-pointer"
                  style={{ height: `${height}px`, minHeight: '20px' }}
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.rate}%
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600 text-center">
                {new Date(item.date).toLocaleDateString('en-US', { 
                  month: 'short',
                  year: '2-digit'
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between text-sm text-gray-500">
        <span>{minRate.toFixed(1)}%</span>
        <span>{maxRate.toFixed(1)}%</span>
      </div>
    </div>
  );
}