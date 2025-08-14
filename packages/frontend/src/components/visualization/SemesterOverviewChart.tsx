// packages/frontend/src/components/visualization/SemesterOverviewChart.tsx
// Enhanced semester overview visualization component

'use client';

import React from 'react';

interface SemesterData {
  _id: string;
  name: string;
  semester: number;
  intake: 'september' | 'march';
  studentCount: number;
  utilizationRate: number;
}

interface SemesterStats {
  totalStudents: number;
  averageUtilization: number;
}

interface SemesterOverviewChartProps {
  semesters: SemesterData[];
  statistics: SemesterStats;
}

export function SemesterOverviewChart({ semesters, statistics }: SemesterOverviewChartProps) {
  // Debug logging to understand what data we're receiving
  console.log('🎯 SemesterOverviewChart received data:');
  console.log('📊 Semesters:', semesters);
  console.log('📈 Statistics:', statistics);
  console.log('🔢 Semesters length:', semesters?.length);
  
  const maxStudents = Math.max(...semesters.map(s => s.studentCount), 1);
  const averageStudents = statistics.totalStudents / semesters.length;

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500 dark:bg-green-400';
    if (rate >= 60) return 'bg-yellow-500 dark:bg-yellow-400';
    if (rate >= 40) return 'bg-orange-500 dark:bg-orange-400';
    return 'bg-red-500 dark:bg-red-400';
  };

  const getUtilizationTextColor = (rate: number) => {
    if (rate >= 80) return 'text-green-700 dark:text-green-300';
    if (rate >= 60) return 'text-yellow-700 dark:text-yellow-300';
    if (rate >= 40) return 'text-orange-700 dark:text-orange-300';
    return 'text-red-700 dark:text-red-300';
  };

  return (
    <div className="space-y-8">
      {/* Semester Distribution Bar Chart */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Student Distribution Across Semesters
          </h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
            Visual representation of student enrollment by semester
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((semesterNum) => {
              const semester = semesters.find(s => s.semester === semesterNum);
              const studentCount = semester?.studentCount || 0;
              const utilizationRate = semester?.utilizationRate || 0;
              const barWidth = maxStudents > 0 ? (studentCount / maxStudents) * 100 : 0;
              
              return (
                <div key={semesterNum} className="flex items-center space-x-4">
                  <div className="w-12 text-sm font-semibold text-secondary-700 dark:text-secondary-300">
                    S{semesterNum}
                  </div>
                  
                  <div className="flex-1 relative">
                    <div className="h-8 bg-secondary-100 dark:bg-secondary-700 rounded-lg overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${semester ? getUtilizationColor(utilizationRate) : 'bg-secondary-200 dark:bg-secondary-600'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    
                    {semester && (
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs font-medium text-white mix-blend-difference">
                          {studentCount} students ({Math.round(utilizationRate)}%)
                        </span>
                      </div>
                    )}
                    
                    {!semester && (
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs text-secondary-500 dark:text-secondary-400">
                          Not initialized
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-20 text-right">
                    {semester && (
                      <span className={`text-sm font-medium ${getUtilizationTextColor(utilizationRate)}`}>
                        {studentCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-secondary-600 dark:text-secondary-400">High (80%+)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span className="text-secondary-600 dark:text-secondary-400">Good (60-79%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span className="text-secondary-600 dark:text-secondary-400">Low (40-59%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-secondary-600 dark:text-secondary-400">Critical (&lt;40%)</span>
                </div>
              </div>
              <div className="text-secondary-500 dark:text-secondary-400">
                Max: {maxStudents} students
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Utilization Heatmap */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Semester Utilization Heatmap
          </h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
            Visual capacity overview across all semesters
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((semesterNum) => {
              const semester = semesters.find(s => s.semester === semesterNum);
              const utilizationRate = semester?.utilizationRate || 0;
              
              return (
                <div
                  key={semesterNum}
                  className={`
                    aspect-square rounded-xl border-2 transition-all duration-300 hover:scale-105 cursor-pointer
                    ${semester 
                      ? 'border-secondary-200 dark:border-secondary-600' 
                      : 'border-dashed border-secondary-300 dark:border-secondary-500'
                    }
                  `}
                  style={{
                    backgroundColor: semester 
                      ? `hsl(${utilizationRate * 1.2}, 70%, ${50 + utilizationRate * 0.3}%)` 
                      : 'transparent'
                  }}
                >
                  <div className="h-full flex flex-col items-center justify-center p-2">
                    <div className="text-lg font-bold text-white mix-blend-difference">
                      S{semesterNum}
                    </div>
                    {semester ? (
                      <>
                        <div className="text-sm font-medium text-white mix-blend-difference">
                          {semester.studentCount}
                        </div>
                        <div className="text-xs text-white mix-blend-difference">
                          {Math.round(utilizationRate)}%
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-secondary-400 dark:text-secondary-500 text-center">
                        Not active
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Intake Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              September Intake
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {semesters
                .filter(s => s.intake === 'september')
                .sort((a, b) => a.semester - b.semester)
                .map((semester) => (
                  <div key={semester._id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                        S{semester.semester}
                      </div>
                      <span className="font-medium text-secondary-900 dark:text-secondary-100">
                        {semester.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
                        {semester.studentCount} students
                      </div>
                      <div className={`text-xs ${getUtilizationTextColor(semester.utilizationRate)}`}>
                        {Math.round(semester.utilizationRate)}% capacity
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              March Intake
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {semesters
                .filter(s => s.intake === 'march')
                .sort((a, b) => a.semester - b.semester)
                .map((semester) => (
                  <div key={semester._id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                        S{semester.semester}
                      </div>
                      <span className="font-medium text-secondary-900 dark:text-secondary-100">
                        {semester.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
                        {semester.studentCount} students
                      </div>
                      <div className={`text-xs ${getUtilizationTextColor(semester.utilizationRate)}`}>
                        {Math.round(semester.utilizationRate)}% capacity
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Health Indicators */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            System Health Indicators
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {semesters.length}
                </span>
              </div>
              <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                Active Semesters
              </div>
              <div className="text-xs text-secondary-500 dark:text-secondary-400">
                of 10 total
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {Math.round(statistics.averageUtilization)}%
                </span>
              </div>
              <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                Avg. Utilization
              </div>
              <div className="text-xs text-secondary-500 dark:text-secondary-400">
                system-wide
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {statistics.totalStudents}
                </span>
              </div>
              <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                Total Students
              </div>
              <div className="text-xs text-secondary-500 dark:text-secondary-400">
                enrolled
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {Math.round(averageStudents)}
                </span>
              </div>
              <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                Avg. per Semester
              </div>
              <div className="text-xs text-secondary-500 dark:text-secondary-400">
                distribution
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}