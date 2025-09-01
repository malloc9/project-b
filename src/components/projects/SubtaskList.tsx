import React, { useState } from 'react';
import type { Subtask, TaskStatus } from '../../types';
import { updateSubtask, deleteSubtask } from '../../services/projectService';
import { formatDate } from '../../utils/dateUtils';

interface SubtaskListProps {
  subtasks: Subtask[];
  onSubtaskUpdate: () => void;
}

const SubtaskList: React.FC<SubtaskListProps> = ({ subtasks, onSubtaskUpdate }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (subtaskId: string, newStatus: TaskStatus) => {
    try {
      setLoading(subtaskId);
      setError(null);
      await updateSubtask(subtaskId, { status: newStatus });
      onSubtaskUpdate();
    } catch (err) {
      console.error('Error updating subtask status:', err);
      setError('Failed to update subtask status');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) {
      return;
    }

    try {
      setLoading(subtaskId);
      setError(null);
      await deleteSubtask(subtaskId);
      onSubtaskUpdate();
    } catch (err) {
      console.error('Error deleting subtask:', err);
      setError('Failed to delete subtask');
    } finally {
      setLoading(null);
    }
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
        return 'To Do';
      case 'in_progress':
        return 'In Progress';
      case 'finished':
        return 'Finished';
      default:
        return status;
    }
  };

  const isOverdue = (dueDate?: Date): boolean => {
    if (!dueDate) return false;
    return new Date() > dueDate;
  };

  const sortedSubtasks = [...subtasks].sort((a, b) => {
    // Sort by status (todo, in_progress, finished) then by due date
    const statusOrder = { 'todo': 0, 'in_progress': 1, 'finished': 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    
    if (statusDiff !== 0) return statusDiff;
    
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subtasks.length === 0) {
    return (
      <div className="text-center py-8">
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">No subtasks</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by adding your first subtask to this project.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedSubtasks.map((subtask) => {
        const overdue = isOverdue(subtask.dueDate);
        const isLoading = loading === subtask.id;

        return (
          <div
            key={subtask.id}
            className={`border rounded-lg p-4 ${
              subtask.status === 'finished' ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
            } ${isLoading ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <h4 className={`text-sm font-medium ${
                    subtask.status === 'finished' ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}>
                    {subtask.title}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subtask.status)}`}>
                    {getStatusLabel(subtask.status)}
                  </span>
                </div>

                {subtask.description && (
                  <p className={`mt-1 text-sm ${
                    subtask.status === 'finished' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {subtask.description}
                  </p>
                )}

                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                  {subtask.dueDate && (
                    <div className={`flex items-center ${overdue && subtask.status !== 'finished' ? 'text-red-600' : ''}`}>
                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {overdue && subtask.status !== 'finished' ? 'Overdue: ' : 'Due: '}
                        {formatDate(subtask.dueDate)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Created {formatDate(subtask.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <select
                  value={subtask.status}
                  onChange={(e) => handleStatusChange(subtask.id, e.target.value as TaskStatus)}
                  disabled={isLoading}
                  className="text-xs border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="finished">Finished</option>
                </select>

                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-red-600 p-1"
                  title="Delete subtask"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SubtaskList;