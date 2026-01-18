import { useState, useEffect } from 'react';
import {
  ContentArea,
  GridLayout,
  StatsCard
} from '../components/layout';
import { CalendarSummary } from '../components/calendar';
import { getUpcomingEvents } from '../services/calendarService';
import { useAuthenticatedUser } from '../hooks/useAuthenticatedUser';
import { usePlants } from '../hooks/usePlants'; // Import usePlants hook
import { useProjects } from '../hooks/useProjects'; // Import useProjects hook
import { useTasks } from '../hooks/useTasks'; // Import useTasks hook
import { useTranslation } from '../hooks/useTranslation';
import { classifyFirebaseError, getErrorMessage } from '../utils/authenticationErrors';

export function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuthenticatedUser();
  const { plants } = usePlants(); // Call usePlants hook with userId
  const { projects } = useProjects(); // Call useProjects hook with userId
  const { tasks } = useTasks(); // Call useTasks hook with userId
  const { t } = useTranslation();
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);

  const pendingTasks = tasks.filter(task => !task.completed);

  // Load upcoming events count for this week
  useEffect(() => {
    // Don't load events if authentication is still loading or user is not authenticated
    if (isLoading || !isAuthenticated || !user) {
      return;
    }

    const loadUpcomingEvents = async () => {
      console.log('Loading upcoming events for user:', user.uid);
      console.log('Auth state:', { isLoading, isAuthenticated, user: !!user });
      
      setEventsLoading(true);
      setEventsError(null);
      
      try {
        const events = await getUpcomingEvents(user.uid, 60); // Next 60 days (2 months)
        setUpcomingEventsCount(events.length);
        console.log('Successfully loaded events:', events.length);
      } catch (err) {
        console.error('Error loading upcoming events count:', err);
        const authError = classifyFirebaseError(err);
        setEventsError(getErrorMessage(authError));
        setUpcomingEventsCount(0);
      } finally {
        setEventsLoading(false);
      }
    };

    loadUpcomingEvents();
  }, [user, isAuthenticated, isLoading]);

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
      value: eventsLoading ? '...' : upcomingEventsCount,
      icon: '📅',
      description: eventsError || t('dashboard:stats.upcomingDeadlines'),
      color: eventsError ? 'red' as const : 'indigo' as const,
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

      {/* Recent activity and calendar summary */}
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

        <CalendarSummary />
      </GridLayout>


    </div>
  );
}