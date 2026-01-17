import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Project, TaskStatus, Priority } from '../../types';
import { getProjectsWithSubtasks, filterProjectsByStatus, searchProjects, filterProjectsByPriority } from '../../services/projectService';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { calculateProjectProgress } from '../../services/projectService';
import { getPriorityColor, getPriorityLabel } from '../../types/utils';

interface ProjectListProps {
  onProjectSelect?: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onProjectSelect }) => {
  const { t, formatDate } = useTranslation();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  useEffect(() => {
    console.log('ProjectList user:', user);
    if (user) {
      loadProjects();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [projects, statusFilter, searchTerm, priorityFilter]);

  const loadProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const userProjects = await getProjectsWithSubtasks(user.uid);
      setProjects(userProjects);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(t('errors:failedToLoadData', { defaultValue: 'Failed to load projects' }));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = projects;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filterProjectsByStatus(filtered, statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filterProjectsByPriority(filtered, priorityFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = searchProjects(filtered, searchTerm);
    }

    setFilteredProjects(filtered);
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'finished':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: TaskStatus): string => {
    switch (status) {
      case 'todo':
        return t('projects:statusLabels.todo');
      case 'in_progress':
        return t('projects:statusLabels.in_progress');
      case 'finished':
        return t('projects:statusLabels.finished');
      default:
        return status;
    }
  };

  const isOverdue = (dueDate?: Date): boolean => {
    if (!dueDate) return false;
    return new Date() > dueDate;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">{t('errors:error')}</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadProjects}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                {t('common:tryAgain')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">{t('projects:title')}</h2>
        <Link
          to="/projects/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('projects:newProject')}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            {t('projects:searchProjects')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="search"
              name="search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={t('projects:searchProjects')}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="sm:w-48">
          <label htmlFor="status-filter" className="sr-only">
            {t('projects:filterByStatus')}
          </label>
          <select
            id="status-filter"
            name="status-filter"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
          >
            <option value="all">{t('projects:allStatus')}</option>
            <option value="todo">{t('projects:statusLabels.todo')}</option>
            <option value="in_progress">{t('projects:statusLabels.in_progress')}</option>
            <option value="finished">{t('projects:statusLabels.finished')}</option>
          </select>
        </div>
        <div className="sm:w-48">
          <label htmlFor="priority-filter" className="sr-only">
            {t('projects:filterByPriority')}
          </label>
          <select
            id="priority-filter"
            name="priority-filter"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
          >
            <option value="all">{t('projects:allPriorities')}</option>
            <option value="low">{t('projects:low')}</option>
            <option value="medium">{t('projects:medium')}</option>
            <option value="high">{t('projects:high')}</option>
            <option value="critical">{t('projects:critical')}</option>
          </select>
        </div>
      </div>

      {/* Project List */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('projects:noProjectsFound')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {projects.length === 0
              ? t('projects:getStartedMessage')
              : t('projects:adjustFiltersMessage')}
          </p>
          {projects.length === 0 && (
            <div className="mt-6">
              <Link
                to="/projects/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('projects:newProject')}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const progress = calculateProjectProgress(project.subtasks);
            const overdue = isOverdue(project.dueDate);

            return (
              <div
                key={project.id}
                className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {project.title}
                          </h3>
                          {project.priority && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                              {getPriorityLabel(project.priority)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {project.description}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>{t('projects:progress')}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Subtasks count */}
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>{project.subtasks.length} {project.subtasks.length === 1 ? t('projects:subtask') : t('projects:subtasks_plural')}</span>
                  </div>

                  {/* Due date */}
                  {project.dueDate && (
                    <div className={`mt-2 flex items-center text-sm ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {overdue ? `${t('projects:overdue')}: ` : `${t('projects:due')}: `}
                        {formatDate(project.dueDate)}
                      </span>
                    </div>
                  )}

                  <div className="mt-6 flex justify-between">
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      onClick={() => onProjectSelect?.(project)}
                    >
                      {t('projects:viewDetails')}
                    </Link>
                    <Link
                      to={`/projects/${project.id}/edit`}
                      className="text-gray-600 hover:text-gray-500 text-sm font-medium"
                    >
                      {t('projects:edit')}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectList;