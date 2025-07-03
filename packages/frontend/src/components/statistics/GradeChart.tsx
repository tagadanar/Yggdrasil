// packages/frontend/src/components/statistics/GradeChart.tsx

'use client';

interface GradeChartProps {
  data: Array<{ grade: string; count: number }>;
}

export function GradeChart({ data }: GradeChartProps) {
  const maxCount = Math.max(...data.map(d => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const gradeColors = {
    'A': 'bg-green-500',
    'B': 'bg-blue-500',
    'C': 'bg-yellow-500',
    'D': 'bg-orange-500',
    'F': 'bg-red-500',
  };

  return (
    <div className="space-y-4">
      <div className="h-64 flex items-end justify-between space-x-3">
        {data.map((item, index) => {
          const height = (item.count / maxCount) * 200;
          const percentage = ((item.count / total) * 100).toFixed(1);
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="relative group">
                <div
                  className={`${gradeColors[item.grade as keyof typeof gradeColors] || 'bg-gray-500'} hover:opacity-80 transition-opacity rounded-t cursor-pointer`}
                  style={{ height: `${height}px`, minHeight: '20px' }}
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.count} students ({percentage}%)
                </div>
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-700">
                {item.grade}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-center text-sm text-gray-600">
        Total Students: {total}
      </div>
    </div>
  );
}