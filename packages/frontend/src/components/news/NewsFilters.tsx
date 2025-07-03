// packages/frontend/src/components/news/NewsFilters.tsx

'use client';

interface Filters {
  category: string;
  search: string;
}

interface NewsFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function NewsFilters({ filters, onFiltersChange }: NewsFiltersProps) {
  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search });
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ ...filters, category });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search articles..."
          />
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <select
          value={filters.category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="general">General</option>
          <option value="academic">Academic</option>
          <option value="facilities">Facilities</option>
          <option value="events">Events</option>
        </select>
      </div>
    </div>
  );
}