import { useAuth } from '../contexts/AuthContext';
import { 
  ContentArea, 
  GridLayout, 
  StatsCard, 
  QuickActionCard 
} from '../components/layout';
import { usePlants } from '../hooks/usePlants'; // Import usePlants hook
import { useProjects } from '../hooks/useProjects'; // Import useProjects hook
import { useTasks } from '../hooks/useTasks'; // Import useTasks hook

export function DashboardPage() {
  const { user } = useAuth();
  const { plants } = usePlants(); // Call usePlants hook with userId
  const { projects } = useProjects(); // Call useProjects hook with userId
  const { tasks } = useTasks(); // Call useTasks hook with userId

  const quickActions = [
    {
      title: 'Plant Codex',
      description: 'Manage your plants, upload photos, and track their growth over time',
      href: '/plants',
      icon: '🌱',
      color: 'green' as const,
    },
    {
      title: 'Projects',
      description: 'Organize complex household projects with subtasks and deadlines',
      href: '/projects',
      icon: '🔨',
      color: 'blue' as const,
    },
    {
      title: 'Tasks',
      description: 'Keep track of simple tasks and daily reminders',
      href: '/tasks',
      icon: '✅',
      color: 'purple' as const,
    },
    {
      title: 'Calendar',
      description: 'View all scheduled items, deadlines, and plant care reminders',
      href: '/calendar',
      icon: '📅',
      color: 'indigo' as const,
    },
  ];

  const pendingTasks = tasks.filter(task => !task.completed);

  const stats = [
    {
      title: 'Plants Tracked',
      value: plants.length,
      icon: '🌱',
      description: 'Active plants in your codex',
      color: 'green' as const,
    },
    {
      title: 'Active Projects',
      value: projects.length, // Use the actual number of projects
      icon: '🔨',
      description: 'Projects in progress',
      color: 'blue' as const,
    },
    {
      title: 'Pending Tasks',
      value: pendingTasks.length, // Use the actual number of pending tasks
      icon: '✅',
      description: 'Tasks awaiting completion',
      color: 'purple' as const,
    },
    {
      title: 'This Week',
      value: '0',
      icon: '📅',
      description: 'Upcoming deadlines',
      color: 'indigo' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <ContentArea className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="text-5xl">👋</div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {user?.displayName || 'User'}!
            </h1>
            <p className="text-gray-600 mt-2 text-base sm:text-lg">
              Manage your household, plants, and projects all in one place
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-500">
              <span className="bg-white px-3 py-1 rounded-full">🏠 Household Management</span>
              <span className="bg-white px-3 py-1 rounded-full">🌱 Plant Care</span>
              <span className="bg-white px-3 py-1 rounded-full">📅 Calendar Sync</span>
            </div>
          </div>
        </div>
      </ContentArea>

      {/* Stats overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
        <GridLayout columns={4} gap="md">
          {stats.map((stat) => (
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
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <GridLayout columns={2} gap="lg" className="lg:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.title}
              title={action.title}
              description={action.description}
              href={action.href}
              icon={action.icon}
              color={action.color}
            />
          ))}
        </GridLayout>
      </div>

      {/* Recent activity and upcoming items */}
      <GridLayout columns={2} gap="lg">
        <ContentArea 
          title="Recent Activity" 
          subtitle="Your latest actions and updates"
        >
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-600 mb-4">
              Your recent activities will appear here
            </p>
            <p className="text-sm text-gray-500">
              Start by adding plants, creating projects, or managing tasks
            </p>
          </div>
        </ContentArea>

        <ContentArea 
          title="Upcoming Items" 
          subtitle="Tasks and deadlines this week"
        >
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⏰</div>
            <p className="text-gray-600 mb-4">
              No upcoming items scheduled
            </p>
            <p className="text-sm text-gray-500">
              Your plant care reminders and project deadlines will show here
            </p>
          </div>
        </ContentArea>
      </GridLayout>

      {/* Tips and getting started */}
      <ContentArea 
        title="Getting Started" 
        subtitle="Tips to make the most of your household management system"
      >
        <GridLayout columns={3} gap="md">
          <div className="text-center p-4">
            <div className="text-3xl mb-3">🌱</div>
            <h3 className="font-medium text-gray-900 mb-2">Add Your First Plant</h3>
            <p className="text-sm text-gray-600">
              Start by adding plants to your codex and upload photos to track their growth
            </p>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl mb-3">🔨</div>
            <h3 className="font-medium text-gray-900 mb-2">Create a Project</h3>
            <p className="text-sm text-gray-600">
              Organize complex household tasks into projects with subtasks and deadlines
            </p>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="font-medium text-gray-900 mb-2">Sync Your Calendar</h3>
            <p className="text-sm text-gray-600">
              Connect with Google Calendar to get reminders for all your tasks and plant care
            </p>
          </div>
        </GridLayout>
      </ContentArea>
    </div>
  );
}