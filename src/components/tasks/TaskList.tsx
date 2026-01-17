import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { SimpleTask, Priority } from '../../types';
import {
  getUserSimpleTasks,
  filterTasksByCompletion,
  searchTasks,
  sortTasksByDueDate,
  toggleTaskCompletion,
  deleteSimpleTask,
  filterTasksByPriority,
  sortTasksByPriority
} from '../../services/simpleTaskService';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { getPriorityColor, getPriorityLabel } from '../../types/utils';

interface TaskListProps {
  onTaskSelect?: (task: SimpleTask) => void;
}

const TaskList: React.FC<TaskListProps> = ({ onTaskSelect }) => {
  const { t, formatDate } = useTranslation();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<SimpleTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<SimpleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionFilter, setCompletionFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'priority'>('asc');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [tasks, completionFilter, searchTerm, sortOrder, priorityFilter]);

  const loadTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const userTasks = await getUserSimpleTasks(user.uid);
      setTasks(userTasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(t('failedToLoad', { ns: 'tasks' }));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = tasks;

    // Apply completion filter
    if (completionFilter !== 'all') {
      filtered = filterTasksByCompletion(filtered, completionFilter === 'completed');
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filterTasksByPriority(filtered, priorityFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = searchTasks(filtered, searchTerm);
    }

    // Apply sorting
    if (sortOrder === 'priority') {
      filtered = sortTasksByPriority(filtered);
    } else {
      filtered = sortTasksByDueDate(filtered, sortOrder === 'asc');
    }

    setFilteredTasks(filtered);
  };

  const handleToggleCompletion = async (taskId: string) => {
    if (!user) return; // Add user null check
    try {
      await toggleTaskCompletion(user.uid, taskId);
      await loadTasks(); // Reload to get updated data
    } catch (err) {
      console.error('Error toggling task completion:', err);
      setError(t('failedToUpdate', { ns: 'tasks' }));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return; // Add user null check
    if (!window.confirm(t('confirmDelete', { ns: 'tasks' }))) {
      return;
    }

    try {
      await deleteSimpleTask(user.uid, taskId);
      await loadTasks(); // Reload to get updated data
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(t('failedToDelete', { ns: 'tasks' }));
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
            <h3 className="text-sm font-medium text-red-800">{t('error', { ns: 'tasks' })}</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadTasks}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                {t('tryAgain', { ns: 'tasks' })}
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
        <h2 className="text-2xl font-bold text-gray-900">{t('title', { ns: 'tasks' })}</h2>
        <Link
          to="/tasks/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('newTask', { ns: 'tasks' })}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            {t('searchTasks', { ns: 'tasks' })}
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
              placeholder={t('searchTasks', { ns: 'tasks' })}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="sm:w-48">
          <label htmlFor="completion-filter" className="sr-only">
            {t('filterByCompletion', { ns: 'tasks' })}
          </label>
          <select
            id="completion-filter"
            name="completion-filter"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={completionFilter}
            onChange={(e) => setCompletionFilter(e.target.value as 'all' | 'completed' | 'pending')}
          >
            <option value="all">{t('allTasks', { ns: 'tasks' })}</option>
            <option value="pending">{t('pending', { ns: 'tasks' })}</option>
            <option value="completed">{t('completed', { ns: 'tasks' })}</option>
          </select>
        </div>
        <div className="sm:w-48">
          <label htmlFor="priority-filter" className="sr-only">
            {t('filterByPriority', { ns: 'tasks' })}
          </label>
          <select
            id="priority-filter"
            name="priority-filter"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
          >
            <option value="all">{t('allPriorities', { ns: 'tasks' })}</option>
            <option value="low">{t('low', { ns: 'tasks' })}</option>
            <option value="medium">{t('medium', { ns: 'tasks' })}</option>
            <option value="high">{t('high', { ns: 'tasks' })}</option>
            <option value="critical">{t('critical', { ns: 'tasks' })}</option>
          </select>
        </div>
        <div className="sm:w-48">
          <label htmlFor="sort-order" className="sr-only">
            {t('sortOrder', { ns: 'tasks' })}
          </label>
          <select
            id="sort-order"
            name="sort-order"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc' | 'priority')}
          >
            <option value="asc">{t('dueDateEarliest', { ns: 'tasks' })}</option>
            <option value="desc">{t('dueDateLatest', { ns: 'tasks' })}</option>
            <option value="priority">{t('sortByPriority', { ns: 'tasks' })}</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
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
              d="M9 5l7 7-7 7"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noTasksFound', { ns: 'tasks' })}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {tasks.length === 0
              ? t('getStartedMessage', { ns: 'tasks' })
              : t('adjustFiltersMessage', { ns: 'tasks' })}
          </p>
          {tasks.length === 0 && (
            <div className="mt-6">
              <Link
                to="/tasks/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('newTask', { ns: 'tasks' })}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const overdue = isOverdue(task.dueDate);

            return (
              <div
                key={task.id}
                className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow duration-200 ${
                  task.completed ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleCompletion(task.id)}
                    className={`flex-shrink-0 mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {task.completed && (
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-lg font-medium ${
                              task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}
                          >
                            {task.title}
                          </h3>
                          {task.priority && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p
                            className={`mt-1 text-sm ${
                              task.completed ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        <Link
                          to={`/tasks/${task.id}/edit`}
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => onTaskSelect?.(task)}
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Due date */}
                    {task.dueDate && (
                      <div className={`mt-2 flex items-center text-sm ${
                        overdue && !task.completed ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {overdue && !task.completed ? `${t('overdue', { ns: 'tasks' })}: ` : `${t('due', { ns: 'tasks' })}: `}
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                    )}

                    {/* Created date */}
                    <div className="mt-1 text-xs text-gray-400">
                      {t('created', { ns: 'tasks' })} {formatDate(task.createdAt)}
                    </div>
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

export default TaskList;