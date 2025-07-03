// packages/frontend/src/components/planning/EventFilters.tsx

'use client';

interface Filters {
  type: 'all' | 'class' | 'exam' | 'meeting' | 'event';
  course: string;
}

interface EventFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function EventFilters({ filters, onFiltersChange }: EventFiltersProps) {
  return (
    <div className="flex space-x-2">
      <select
        value={filters.type}
        onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as any })}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Types</option>
        <option value="class">Classes</option>
        <option value="exam">Exams</option>
        <option value="meeting">Meetings</option>
        <option value="event">Events</option>
      </select>
    </div>
  );
}