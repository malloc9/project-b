import { 
  ContentArea, 
  GridLayout, 
  StatsCard 
} from '../components/layout';
import { usePlants } from '../hooks/usePlants'; // Import usePlants hook
import { useProjects } from '../hooks/useProjects'; // Import useProjects hook
import { useTasks } from '../hooks/useTasks'; // Import useTasks hook

export function DashboardPage() {
  const { plants } = usePlants(); // Call usePlants hook with userId
  const { projects } = useProjects(); // Call useProjects hook with userId
  const { tasks } = useTasks(); // Call useTasks hook with userId

  const pendingTasks = tasks.filter(task => !task.completed);

  const stats = [
    {
      title: 'Plants Tracked',
      value: plants.length,
      icon: '🌱',
      description: 'Active plants in your codex',
      color: 'green' as const,
      href: '/plants',
    },
    {
      title: 'Active Projects',
      value: projects.length, // Use the actual number of projects
      icon: '🔨',
      description: 'Projects in progress',
      color: 'blue' as const,
      href: '/projects',
    },
    {
      title: 'Pending Tasks',
      value: pendingTasks.length, // Use the actual number of pending tasks
      icon: '✅',
      description: 'Tasks awaiting completion',
      color: 'purple' as const,
      href: '/tasks',
    },
    {
      title: 'This Week',
      value: '0',
      icon: '📅',
      description: 'Upcoming deadlines',
      color: 'indigo' as const,
      href: '/calendar',
    },
  ];

  return (
    <div className="space-y-6">
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
              href={stat.href}
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