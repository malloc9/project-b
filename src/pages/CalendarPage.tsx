import { ContentArea, GridLayout, StatsCard } from '../components/layout';
import { CalendarSettings } from '../components/calendar/CalendarSettings';
import { useCalendar } from '../contexts/CalendarContext';

export function CalendarPage() {
  const { isConnected, connectCalendar } = useCalendar();
  
  const calendarStats = [
    {
      title: 'This Week',
      value: '0',
      icon: '📅',
      description: 'Scheduled items this week',
      color: 'indigo' as const,
    },
    {
      title: 'Plant Care',
      value: '0',
      icon: '🌱',
      description: 'Plant care reminders',
      color: 'green' as const,
    },
    {
      title: 'Deadlines',
      value: '0',
      icon: '⏰',
      description: 'Project and task deadlines',
      color: 'red' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <ContentArea
        title="Calendar Integration"
        subtitle="View all your plant care schedules, project deadlines, and task reminders in one unified calendar"
        actions={
          !isConnected ? (
            <button 
              onClick={connectCalendar}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Connect Calendar
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Connected</span>
            </div>
          )
        }
      >
        <div></div>
      </ContentArea>

      {/* Stats */}
      <GridLayout columns={3} gap="md">
        {calendarStats.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
            color={stat.color}
          />
        ))}
      </GridLayout>
      
      {/* Calendar Settings */}
      <CalendarSettings />
      
      {/* Main content */}
      <ContentArea>
        <div className="text-center py-16">
          <span className="text-8xl mb-6 block">📅</span>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Unified Calendar View
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            All your household management activities synchronized with Google Calendar for seamless scheduling and reminders
          </p>
          <div className="space-y-4 text-sm text-gray-500 max-w-lg mx-auto">
            <div className="flex items-center space-x-3">
              <span className="text-indigo-500">✓</span>
              <span>Automatic sync with Google Calendar</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-indigo-500">✓</span>
              <span>Plant care reminders and watering schedules</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-indigo-500">✓</span>
              <span>Project deadlines and task due dates</span>
            </div>
          </div>
          {!isConnected && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-yellow-800">
                Connect your Google Calendar above to enable automatic syncing of tasks and reminders.
              </p>
            </div>
          )}
        </div>
      </ContentArea>
    </div>
  );
}