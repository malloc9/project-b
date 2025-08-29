import { useState } from 'react';
import type { PlantCareTask } from '../../types';
import { PlantService } from '../../services/plantService';
import { useAuth } from '../../contexts/AuthContext';
import { CareTaskForm } from './CareTaskForm';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { format, formatDistanceToNow } from 'date-fns';

interface CareTaskListProps {
  plantId: string;
  careTasks: PlantCareTask[];
  onTaskUpdate?: (task: PlantCareTask) => void;
  onTaskAdd?: (task: PlantCareTask) => void;
  onTaskDelete?: (taskId: string) => void;
}

export function CareTaskList({ plantId, careTasks, onTaskUpdate, onTaskAdd, onTaskDelete }: CareTaskListProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<PlantCareTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sortedTasks = careTasks.sort((a, b) => {
    // Sort by completion status first (incomplete first), then by due date
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const handleToggleComplete = async (task: PlantCareTask) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const updatedTask = { ...task, completed: !task.completed };
      await PlantService.updatePlantCareTask(user.uid, plantId, task.id, { completed: !task.completed });
      
      onTaskUpdate?.(updatedTask);
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskSave = async (taskData: Omit<PlantCareTask, 'id' | 'plantId'>) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      if (editingTask) {
        // Update existing task
        await PlantService.updatePlantCareTask(user.uid, plantId, editingTask.id, taskData);
        const updatedTask = { ...editingTask, ...taskData };
        onTaskUpdate?.(updatedTask);
      } else {
        // Create new task
        const newTask = await PlantService.addCareTaskToPlant(user.uid, plantId, taskData);
        onTaskAdd?.(newTask);
      }

      setShowForm(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Error saving task:', err);
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!user) return;

    if (window.confirm('Are you sure you want to delete this care task?')) {
      try {
        setIsLoading(true);
        setError(null);
        
        await PlantService.removeCareTaskFromPlant(user.uid, plantId, taskId);
        onTaskDelete?.(taskId);
      } catch (err) {
        console.error('Error deleting task:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete task');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditTask = (task: PlantCareTask) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Care Tasks</h3>
        <button 
          onClick={() => setShowForm(true)}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Loading...
            </>
          ) : (
            'Add Care Task'
          )}
        </button>
      </div>

      {error && (
        <ErrorMessage 
          message={error} 
          onRetry={() => setError(null)}
        />
      )}

      {careTasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <span className="text-6xl mb-4 block">💧</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No care tasks scheduled
          </h3>
          <p className="text-gray-600 mb-4">
            Add care tasks like watering, fertilizing, or repotting to keep your plant healthy
          </p>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Add First Task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => {
            const isOverdue = !task.completed && task.dueDate <= new Date();
            const isUpcoming = !task.completed && task.dueDate > new Date();

            return (
              <div
                key={task.id}
                className={`p-4 rounded-lg border ${
                  task.completed
                    ? 'bg-gray-50 border-gray-200'
                    : isOverdue
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          disabled={isLoading}
                          className="text-gray-400 hover:text-gray-600 disabled:text-gray-300 transition-colors disabled:cursor-not-allowed"
                          title="Edit task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleTaskDelete(task.id)}
                          disabled={isLoading}
                          className="text-gray-400 hover:text-red-600 disabled:text-gray-300 transition-colors disabled:cursor-not-allowed"
                          title="Delete task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center space-x-4 text-sm">
                      <div className={`flex items-center space-x-1 ${
                        isOverdue ? 'text-red-600' : isUpcoming ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>
                          {format(task.dueDate, 'MMM d, yyyy')}
                          {!task.completed && (
                            <span className="ml-1">
                              ({formatDistanceToNow(task.dueDate, { addSuffix: true })})
                            </span>
                          )}
                        </span>
                      </div>

                      {task.recurrence && (
                        <div className="flex items-center space-x-1 text-gray-500">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          <span>
                            Every {task.recurrence.interval} {task.recurrence.type}
                            {task.recurrence.interval > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Care Task Form Modal */}
      {showForm && (
        <CareTaskForm
          task={editingTask}
          onSave={handleTaskSave}
          onCancel={handleCancelForm}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}