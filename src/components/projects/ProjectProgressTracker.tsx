import React from 'react';
import type { Project, Subtask } from '../../types';
import { 
  getProjectStatistics, 
  getSubtaskStatistics, 
  getOverdueProjects, 
  getProjectsDueSoon,
  getOverdueSubtasks,
  getSubtasksDueSoon
} from '../../services/projectService';
import { useTranslation } from '../../hooks/useTranslation';

interface ProjectProgressTrackerProps {
  projects: Project[];
  selectedProject?: Project;
  subtasks?: Subtask[];
}

const ProjectProgressTracker: React.FC<ProjectProgressTrackerProps> = ({
  projects,
  selectedProject,
  subtasks = []
}) => {
  const { formatDate } = useTranslation();
  const projectStats = getProjectStatistics(projects);
  const subtaskStats = selectedProject ? getSubtaskStatistics(subtasks) : null;
  const overdueProjects = getOverdueProjects(projects);
  const projectsDueSoon = getProjectsDueSoon(projects);
  const overdueSubtasks = selectedProject ? getOverdueSubtasks(subtasks) : [];
  const subtasksDueSoon = selectedProject ? getSubtasksDueSoon(subtasks) : [];

  

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    subtitle?: string;
    color?: string;
    icon?: React.ReactNode;
  }> = ({ title, value, subtitle, color = 'text-gray-900', icon }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {icon && <div className="text-gray-400">{icon}</div>}
          </div>
          <div className={icon ? "ml-5 w-0 flex-1" : "w-full"}>
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className={`text-lg font-medium ${color}`}>{value}</dd>
              {subtitle && <dd className="text-sm text-gray-500">{subtitle}</dd>}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  const ProgressBar: React.FC<{
    percentage: number;
    color?: string;
    height?: string;
  }> = ({ percentage, color = 'bg-blue-600', height = 'h-2' }) => (
    <div className={`w-full bg-gray-200 rounded-full ${height}`}>
      <div
        className={`${color} ${height} rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Overall Project Statistics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Project Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Projects"
            value={projectStats.total}
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            title="Completed"
            value={projectStats.completed}
            subtitle={`${projectStats.completionRate}% completion rate`}
            color="text-green-600"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="In Progress"
            value={projectStats.inProgress}
            color="text-blue-600"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Overdue"
            value={projectStats.overdue}
            color="text-red-600"
            icon={
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Progress Visualization */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Progress Breakdown</h4>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Overall Completion</span>
              <span>{projectStats.completionRate}%</span>
            </div>
            <ProgressBar percentage={projectStats.completionRate} />
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">To Do</span>
                <span className="text-gray-900">{projectStats.todo}</span>
              </div>
              <ProgressBar 
                percentage={projectStats.total > 0 ? (projectStats.todo / projectStats.total) * 100 : 0} 
                color="bg-gray-400"
                height="h-1"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-blue-600">In Progress</span>
                <span className="text-blue-900">{projectStats.inProgress}</span>
              </div>
              <ProgressBar 
                percentage={projectStats.total > 0 ? (projectStats.inProgress / projectStats.total) * 100 : 0} 
                color="bg-blue-600"
                height="h-1"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-green-600">Completed</span>
                <span className="text-green-900">{projectStats.completed}</span>
              </div>
              <ProgressBar 
                percentage={projectStats.total > 0 ? (projectStats.completed / projectStats.total) * 100 : 0} 
                color="bg-green-600"
                height="h-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Selected Project Details */}
      {selectedProject && subtaskStats && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {selectedProject.title} - Subtask Progress
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Subtasks"
              value={subtaskStats.total}
            />
            <StatCard
              title="Completed"
              value={subtaskStats.completed}
              subtitle={`${subtaskStats.completionRate}% complete`}
              color="text-green-600"
            />
            <StatCard
              title="In Progress"
              value={subtaskStats.inProgress}
              color="text-blue-600"
            />
            <StatCard
              title="Overdue"
              value={subtaskStats.overdue}
              color="text-red-600"
            />
          </div>
        </div>
      )}

      {/* Alerts and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Items */}
        {(overdueProjects.length > 0 || overdueSubtasks.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h4 className="text-sm font-medium text-red-800">Overdue Items</h4>
            </div>
            <div className="space-y-2">
              {overdueProjects.map(project => (
                <div key={project.id} className="text-sm text-red-700">
                  <span className="font-medium">Project:</span> {project.title}
                  {project.dueDate && (
                    <span className="text-red-600 ml-2">
                      (Due: {formatDate(project.dueDate)})
                    </span>
                  )}
                </div>
              ))}
              {overdueSubtasks.map(subtask => (
                <div key={subtask.id} className="text-sm text-red-700">
                  <span className="font-medium">Subtask:</span> {subtask.title}
                  {subtask.dueDate && (
                    <span className="text-red-600 ml-2">
                      (Due: {formatDate(subtask.dueDate)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Due Soon */}
        {(projectsDueSoon.length > 0 || subtasksDueSoon.length > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h4 className="text-sm font-medium text-yellow-800">Due Soon (Next 7 Days)</h4>
            </div>
            <div className="space-y-2">
              {projectsDueSoon.map(project => (
                <div key={project.id} className="text-sm text-yellow-700">
                  <span className="font-medium">Project:</span> {project.title}
                  {project.dueDate && (
                    <span className="text-yellow-600 ml-2">
                      (Due: {formatDate(project.dueDate)})
                    </span>
                  )}
                </div>
              ))}
              {subtasksDueSoon.map(subtask => (
                <div key={subtask.id} className="text-sm text-yellow-700">
                  <span className="font-medium">Subtask:</span> {subtask.title}
                  {subtask.dueDate && (
                    <span className="text-yellow-600 ml-2">
                      (Due: {formatDate(subtask.dueDate)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No alerts message */}
      {overdueProjects.length === 0 && 
       overdueSubtasks.length === 0 && 
       projectsDueSoon.length === 0 && 
       subtasksDueSoon.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-800">
              All projects and subtasks are on track! 🎉
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectProgressTracker;