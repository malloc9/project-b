import React, { useState } from 'react';
import { Project, Subtask, TaskStatus } from '../../types';
import { 
  updateProject, 
  updateSubtaskWithProjectSync, 
  bulkUpdateSubtasks 
} from '../../services/projectService';

interface ProjectStatusManagerProps {
  project: Project;
  subtasks: Subtask[];
  onUpdate: () => void;
}

const ProjectStatusManager: React.FC<ProjectStatusManagerProps> = ({
  project,
  subtasks,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<TaskStatus>('todo');
  const [error, setError] = useState<string | null>(null);

  const handleProjectStatusChange = async (newStatus: TaskStatus) => {
    try {
      setLoading(true);
      setError(null);
      await updateProject(project.id, { status: newStatus });
      onUpdate();
    } catch (err) {
      console.error('Error updating project status:', err);
      setError('Failed to update project status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubtaskStatusChange = async (subtaskId: string, newStatus: TaskStatus) => {
    try {
      setLoading(true);
      setError(null);
      await updateSubtaskWithProjectSync(subtaskId, { status: newStatus });
      onUpdate();
    } catch (err) {
      console.error('Error updating subtask status:', err);
      setError('Failed to update subtask status');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedSubtasks.size === 0) return;

    try {
      setLoading(true);
      setError(null);
      
      const updates = Array.from(selectedSubtasks).map(id => ({
        id,
        updates: { status: bulkStatus }
      }));

      await bulkUpdateSubtasks(updates);
      setSelectedSubtasks(new Set());
      onUpdate();
    } catch (err) {
      console.error('Error bulk updating subtasks:', err);
      setError('Failed to update subtasks');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubtaskSelection = (subtaskId: string) => {
    const newSelection = new Set(selectedSubtasks);
    if (newSelection.has(subtaskId)) {
      newSelection.delete(subtaskId);
    } else {
      newSelection.add(subtaskId);
    }
    setSelectedSubtasks(newSelection);
  };

  const selectAllSubtasks = () => {
    setSelectedSubtasks(new Set(subtasks.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedSubtasks(new Set());
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

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Status Management</h3>
      </div>

      <div className="px-6 py-4 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Project Status</h4>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
              {getStatusLabel(project.status)}
            </span>
            <select
              value={project.status}
              onChange={(e) => handleProjectStatusChange(e.target.value as TaskStatus)}
              disabled={loading}
              className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="finished">Finished</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {subtasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Bulk Subtask Actions</h4>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAllSubtasks}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  disabled={loading}
                  className="text-sm text-gray-600 hover:text-gray-500 disabled:opacity-50"
                >
                  Clear Selection
                </button>
              </div>
              
              {selectedSubtasks.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedSubtasks.size} selected
                  </span>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as TaskStatus)}
                    disabled={loading}
                    className="block pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="finished">Finished</option>
                  </select>
                  <button
                    onClick={handleBulkStatusUpdate}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Selected'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subtask List with Status Controls */}
        {subtasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Individual Subtask Status</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    selectedSubtasks.has(subtask.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedSubtasks.has(subtask.id)}
                      onChange={() => toggleSubtaskSelection(subtask.id)}
                      disabled={loading}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {subtask.title}
                      </p>
                      {subtask.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {subtask.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subtask.status)}`}>
                      {getStatusLabel(subtask.status)}
                    </span>
                    <select
                      value={subtask.status}
                      onChange={(e) => handleSubtaskStatusChange(subtask.id, e.target.value as TaskStatus)}
                      disabled={loading}
                      className="block pl-2 pr-8 py-1 text-xs border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="finished">Finished</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBulkStatusUpdate()}
              disabled={loading || selectedSubtasks.size === 0}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Mark Selected as {getStatusLabel(bulkStatus)}
            </button>
            
            {project.status !== 'finished' && (
              <button
                onClick={() => handleProjectStatusChange('finished')}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                Complete Project
              </button>
            )}
            
            {project.status === 'todo' && (
              <button
                onClick={() => handleProjectStatusChange('in_progress')}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Start Project
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectStatusManager;