import { ContentArea, GridLayout, StatsCard } from '../components/layout';

export function ProjectsPage() {
  const projectStats = [
    {
      title: 'Active Projects',
      value: '0',
      icon: '🔨',
      description: 'Projects in progress',
      color: 'blue' as const,
    },
    {
      title: 'Total Subtasks',
      value: '0',
      icon: '📋',
      description: 'Individual tasks across all projects',
      color: 'purple' as const,
    },
    {
      title: 'Completed',
      value: '0',
      icon: '✅',
      description: 'Finished projects this month',
      color: 'green' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <ContentArea
        title="Household Projects"
        subtitle="Organize complex household tasks into manageable projects with subtasks and deadlines"
        actions={
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            New Project
          </button>
        }
      >
        <div></div>
      </ContentArea>

      {/* Stats */}
      <GridLayout columns={3} gap="md">
        {projectStats.map((stat) => (
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
      
      {/* Main content */}
      <ContentArea>
        <div className="text-center py-16">
          <span className="text-8xl mb-6 block">🔨</span>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Organize Your Household Projects
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Break down complex household tasks into manageable projects with subtasks, deadlines, and progress tracking
          </p>
          <div className="space-y-4 text-sm text-gray-500 max-w-lg mx-auto">
            <div className="flex items-center space-x-3">
              <span className="text-blue-500">✓</span>
              <span>Create projects with multiple subtasks</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-blue-500">✓</span>
              <span>Track progress with todo, in progress, and finished states</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-blue-500">✓</span>
              <span>Set deadlines and sync with Google Calendar</span>
            </div>
          </div>
          <div className="mt-8 text-xs text-gray-400">
            Project management features will be implemented in upcoming development tasks
          </div>
        </div>
      </ContentArea>
    </div>
  );
}