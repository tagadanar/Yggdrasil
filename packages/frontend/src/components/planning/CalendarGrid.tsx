// packages/frontend/src/components/planning/CalendarGrid.tsx

'use client';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: 'class' | 'exam' | 'meeting' | 'event';
  location?: string;
  instructor?: string;
  course?: {
    id: string;
    title: string;
  };
}

interface CalendarGridProps {
  events: CalendarEvent[];
  selectedDate: Date;
  viewMode: 'month' | 'week' | 'day';
  onEventClick: (event: CalendarEvent) => void;
  canEdit: boolean;
}

export function CalendarGrid({ 
  events, 
  selectedDate, 
  viewMode, 
  onEventClick, 
  canEdit 
}: CalendarGridProps) {
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'class':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'exam':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'meeting':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'event':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const renderMonthView = () => {
    const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[120px] bg-gray-50 border border-gray-200 p-2">
        </div>
      );
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const dayEvents = getEventsForDate(currentDate);
      const isToday = currentDate.toDateString() === new Date().toDateString();

      days.push(
        <div key={day} className={`min-h-[120px] border border-gray-200 p-2 ${
          isToday ? 'bg-blue-50' : 'bg-white'
        }`}>
          <div className={`text-sm font-medium mb-2 ${
            isToday ? 'text-blue-600' : 'text-gray-900'
          }`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                onClick={() => canEdit && onEventClick(event)}
                className={`text-xs p-1 rounded border cursor-pointer truncate ${
                  getEventTypeColor(event.type)
                } ${canEdit ? 'hover:opacity-80' : ''}`}
                title={`${event.title} - ${formatTime(event.startDate)}`}
              >
                <div className="font-medium truncate">{event.title}</div>
                <div className="text-xs opacity-75">
                  {formatTime(event.startDate)}
                </div>
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500 font-medium">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 gap-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-gray-50 border-b border-gray-200 p-3 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      weekDays.push(currentDay);
    }

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-8 gap-0">
          {/* Time column header */}
          <div className="bg-gray-50 border-b border-gray-200 p-3"></div>
          
          {/* Day headers */}
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={index} className={`bg-gray-50 border-b border-gray-200 p-3 text-center ${
                isToday ? 'bg-blue-50' : ''
              }`}>
                <div className="text-sm font-medium text-gray-700">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold ${
                  isToday ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}

          {/* Time slots */}
          {Array.from({ length: 12 }, (_, hour) => hour + 8).map((hour) => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="border-r border-gray-200 p-2 text-xs text-gray-500 text-right">
                {hour}:00
              </div>
              
              {/* Day columns */}
              {weekDays.map((day, dayIndex) => {
                const dayEvents = getEventsForDate(day).filter(event => {
                  const eventHour = new Date(event.startDate).getHours();
                  return eventHour === hour;
                });

                return (
                  <div key={dayIndex} className="border-r border-b border-gray-200 p-1 min-h-[60px]">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => canEdit && onEventClick(event)}
                        className={`text-xs p-2 rounded mb-1 cursor-pointer ${
                          getEventTypeColor(event.type)
                        } ${canEdit ? 'hover:opacity-80' : ''}`}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-xs opacity-75">
                          {formatTime(event.startDate)} - {formatTime(event.endDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(selectedDate).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
        </div>
        
        <div className="p-4">
          {dayEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No events scheduled for this day
            </p>
          ) : (
            <div className="space-y-4">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => canEdit && onEventClick(event)}
                  className={`p-4 rounded-lg border-l-4 cursor-pointer ${
                    getEventTypeColor(event.type)
                  } ${canEdit ? 'hover:opacity-80' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                      <div className="flex items-center mt-2 text-sm text-gray-500 space-x-4">
                        <span>
                          {formatTime(event.startDate)} - {formatTime(event.endDate)}
                        </span>
                        {event.location && (
                          <span className="flex items-center">
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.location}
                          </span>
                        )}
                        {event.instructor && (
                          <span>{event.instructor}</span>
                        )}
                      </div>
                      {event.course && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {event.course.title}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getEventTypeColor(event.type)
                      }`}>
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  switch (viewMode) {
    case 'week':
      return renderWeekView();
    case 'day':
      return renderDayView();
    default:
      return renderMonthView();
  }
}