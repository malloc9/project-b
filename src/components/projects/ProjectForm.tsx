import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { TaskStatus } from '../../types';
import { createProject, getProject, updateProject } from '../../services/projectService';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { RichTextEditor } from '../common/RichTextEditor';

interface ProjectFormData {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

const ProjectForm: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isEditing = Boolean(projectId);

  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    status: 'todo',
    dueDate: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [errors, setErrors] = useState<Partial<ProjectFormData>>({});

  useEffect(() => {
    if (isEditing && projectId && user) {
      loadProject();
    }
  }, [isEditing, projectId, user]);

  const loadProject = async () => {
    if (!projectId || !user) return;

    try {
      setInitialLoading(true);
      const project = await getProject(projectId, user.uid);
      
      if (!project) {
        navigate('/projects');
        return;
      }

      if (project.userId !== user.uid) {
        navigate('/projects');
        return;
      }

      setFormData({
        title: project.title,
        description: project.description,
        status: project.status,
        dueDate: project.dueDate ? project.dueDate.toISOString().split('T')[0] : '',
        priority: project.priority || 'medium'
      });
    } catch (err) {
      console.error('Error loading project:', err);
      navigate('/projects');
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProjectFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = t('projects:projectTitleRequired');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('projects:descriptionRequired');
    }

    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate);
      if (isNaN(dueDate.getTime())) {
        newErrors.dueDate = t('projects:invalidDateFormat');
      } else if (dueDate < new Date()) {
        newErrors.dueDate = t('projects:dueDateCannotBePast');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('ProjectForm submit - user:', user);
    console.log('ProjectForm submit - user.uid:', user?.uid);

    if (!validateForm() || !user) {
      console.log('Validation failed or no user');
      return;
    }

    try {
      setLoading(true);
      
      const projectData = {
        userId: user.uid,
        title: formData.title.trim(),
        description: formData.description,
        status: formData.status,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        priority: formData.priority,
        subtasks: []
      };

      console.log('Creating project with data:', projectData);

      if (isEditing && projectId) {
        await updateProject(projectId, user.uid, projectData);
        navigate(`/projects/${projectId}`);
      } else {
        const newProjectId = await createProject(projectData);
        navigate(`/projects/${newProjectId}`);
      }
    } catch (err) {
      console.error('Error saving project:', err);
      setErrors({ title: t('projects:failedToSaveProject') });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? t('projects:editProject') : t('projects:createNewProject')}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              {t('projects:projectTitle')} *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.title ? 'border-red-300' : ''
              }`}
              placeholder={t('projects:enterProjectTitle')}
              disabled={loading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              {t('projects:description')} *
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(value) => handleInputChange('description', value)}
              placeholder={t('projects:describeProject')}
              disabled={loading}
              error={errors.description}
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              {t('projects:status')}
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={loading}
            >
              <option value="todo">{t('projects:statusLabels.todo')}</option>
              <option value="in_progress">{t('projects:statusLabels.in_progress')}</option>
              <option value="finished">{t('projects:statusLabels.finished')}</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
              {t('projects:dueDate')}
            </label>
            <input
              type="date"
              id="dueDate"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.dueDate ? 'border-red-300' : ''
              }`}
              disabled={loading}
            />
            {errors.dueDate && (
              <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {t('projects:optionalDeadline')}
            </p>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              {t('projects:priority')}
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={loading}
            >
              <option value="low">{t('projects:low')}</option>
              <option value="medium">{t('projects:medium')}</option>
              <option value="high">{t('projects:high')}</option>
              <option value="critical">{t('projects:critical')}</option>
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(isEditing ? `/projects/${projectId}` : '/projects')}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {t('projects:cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? t('projects:updating') : t('projects:creating')}
                </div>
              ) : (
                isEditing ? t('projects:updateProject') : t('projects:createProject')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm;