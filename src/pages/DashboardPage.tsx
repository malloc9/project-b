import {
  ContentArea,
  GridLayout,
  StatsCard
} from '../components/layout';
import { usePlants } from '../hooks/usePlants'; // Import usePlants hook
import { useProjects } from '../hooks/useProjects'; // Import useProjects hook
import { useTasks } from '../hooks/useTasks'; // Import useTasks hook
import { useTranslation } from '../hooks/useTranslation';

export function DashboardPage() {
  const { plants } = usePlants(); // Call usePlants hook with userId
  const { projects } = useProjects(); // Call useProjects hook with userId
  const { tasks } = useTasks(); // Call useTasks hook with userId
  const { t } = useTranslation();

  const pendingTasks = tasks.filter(task => !task.completed);

  const stats = [
    {
      title: t('dashboard:stats.plantsTracked'),
      value: plants.length,
      icon: '🌱',
      description: t('dashboard:stats.activePlantsInCodex'),
      color: 'green' as const,
      href: '/plants',
    },
    {
      title: t('dashboard:stats.activeProjects'),
      value: projects.length, // Use the actual number of projects
      icon: '🔨',
      description: t('dashboard:stats.projectsInProgress'),
      color: 'blue' as const,
      href: '/projects',
    },
    {
      title: t('dashboard:stats.pendingTasks'),
      value: pendingTasks.length, // Use the actual number of pending tasks
      icon: '✅',
      description: t('dashboard:stats.tasksAwaitingCompletion'),
      color: 'purple' as const,
      href: '/tasks',
    },
    {
      title: t('dashboard:stats.thisWeek'),
      value: '0',
      icon: '📅',
      description: t('dashboard:stats.upcomingDeadlines'),
      color: 'indigo' as const,
      href: '/calendar',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard:overview')}</h2>
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
          title={t('dashboard:recentActivity')}
          subtitle={t('dashboard:recentActivitySubtitle')}
        >
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-600 mb-4">
              {t('dashboard:recentActivitiesWillAppear')}
            </p>
            <p className="text-sm text-gray-500">
              {t('dashboard:startByAddingPlants')}
            </p>
          </div>
        </ContentArea>

        <ContentArea
          title={t('dashboard:upcomingItems')}
          subtitle={t('dashboard:upcomingItemsSubtitle')}
        >
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⏰</div>
            <p className="text-gray-600 mb-4">
              {t('dashboard:noUpcomingItemsScheduled')}
            </p>
            <p className="text-sm text-gray-500">
              {t('dashboard:plantCareRemindersWillShow')}
            </p>
          </div>
        </ContentArea>
      </GridLayout>


    </div>
  );
}