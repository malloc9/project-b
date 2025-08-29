import { conflictResolver, ConflictData } from '../conflictResolution';
import { Plant, Project, SimpleTask, PlantCareTask, Subtask } from '../../types';

describe('ConflictResolutionManager', () => {
  describe('Timestamp Resolution', () => {
    it('should resolve conflicts by choosing newer timestamp', () => {
      const older = new Date('2024-01-01T10:00:00Z');
      const newer = new Date('2024-01-01T11:00:00Z');

      const conflict: ConflictData<SimpleTask> = {
        local: {
          id: 'task1',
          userId: 'user1',
          title: 'Local Task',
          completed: false,
          createdAt: older,
          updatedAt: older
        },
        remote: {
          id: 'task1',
          userId: 'user1',
          title: 'Remote Task',
          completed: true,
          createdAt: older,
          updatedAt: newer
        },
        lastSync: 0
      };

      const resolution = conflictResolver.resolveByTimestamp(conflict);

      expect(resolution.strategy).toBe('remote');
      expect(resolution.resolved.title).toBe('Remote Task');
      expect(resolution.resolved.completed).toBe(true);
    });

    it('should choose local when local is newer', () => {
      const older = new Date('2024-01-01T10:00:00Z');
      const newer = new Date('2024-01-01T11:00:00Z');

      const conflict: ConflictData<SimpleTask> = {
        local: {
          id: 'task1',
          userId: 'user1',
          title: 'Local Task',
          completed: false,
          createdAt: older,
          updatedAt: newer
        },
        remote: {
          id: 'task1',
          userId: 'user1',
          title: 'Remote Task',
          completed: true,
          createdAt: older,
          updatedAt: older
        },
        lastSync: 0
      };

      const resolution = conflictResolver.resolveByTimestamp(conflict);

      expect(resolution.strategy).toBe('local');
      expect(resolution.resolved.title).toBe('Local Task');
    });
  });

  describe('Plant Conflict Resolution', () => {
    it('should merge plant data when timestamps are close', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');
      const closeTime = new Date('2024-01-01T10:30:00Z'); // 30 minutes later

      const conflict: ConflictData<Plant> = {
        local: {
          id: 'plant1',
          userId: 'user1',
          name: 'Local Plant Name',
          species: 'Local Species',
          description: 'Local description',
          photos: [{ id: 'photo1', url: 'local.jpg', thumbnailUrl: 'local_thumb.jpg', uploadedAt: baseTime }],
          careTasks: [],
          createdAt: baseTime,
          updatedAt: closeTime
        },
        remote: {
          id: 'plant1',
          userId: 'user1',
          name: '', // Empty name
          species: 'Remote Species',
          description: 'Remote description',
          photos: [{ id: 'photo2', url: 'remote.jpg', thumbnailUrl: 'remote_thumb.jpg', uploadedAt: closeTime }],
          careTasks: [],
          createdAt: baseTime,
          updatedAt: baseTime
        },
        lastSync: 0
      };

      const resolution = conflictResolver.resolvePlantConflict(conflict);

      expect(resolution.strategy).toBe('merge');
      expect(resolution.resolved.name).toBe('Local Plant Name'); // Non-empty name preferred
      expect(resolution.resolved.species).toBe('Local Species'); // Local species kept
      expect(resolution.resolved.photos).toHaveLength(2); // Photos merged
    });

    it('should use timestamp resolution for plants with large time difference', () => {
      const older = new Date('2024-01-01T10:00:00Z');
      const muchNewer = new Date('2024-01-01T14:00:00Z'); // 4 hours later

      const conflict: ConflictData<Plant> = {
        local: {
          id: 'plant1',
          userId: 'user1',
          name: 'Local Plant',
          description: 'Local description',
          photos: [],
          careTasks: [],
          createdAt: older,
          updatedAt: older
        },
        remote: {
          id: 'plant1',
          userId: 'user1',
          name: 'Remote Plant',
          description: 'Remote description',
          photos: [],
          careTasks: [],
          createdAt: older,
          updatedAt: muchNewer
        },
        lastSync: 0
      };

      const resolution = conflictResolver.resolvePlantConflict(conflict);

      expect(resolution.strategy).toBe('remote');
      expect(resolution.resolved.name).toBe('Remote Plant');
    });
  });

  describe('Project Conflict Resolution', () => {
    it('should merge subtasks when both versions have them', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');

      const localSubtask: Subtask = {
        id: 'subtask1',
        projectId: 'project1',
        title: 'Local Subtask',
        status: 'in_progress',
        createdAt: baseTime,
        updatedAt: baseTime
      };

      const remoteSubtask: Subtask = {
        id: 'subtask2',
        projectId: 'project1',
        title: 'Remote Subtask',
        status: 'todo',
        createdAt: baseTime,
        updatedAt: baseTime
      };

      const conflict: ConflictData<Project> = {
        local: {
          id: 'project1',
          userId: 'user1',
          title: 'Local Project',
          description: 'Local description',
          status: 'todo',
          subtasks: [localSubtask],
          createdAt: baseTime,
          updatedAt: baseTime
        },
        remote: {
          id: 'project1',
          userId: 'user1',
          title: 'Remote Project',
          description: 'Remote description',
          status: 'in_progress',
          subtasks: [remoteSubtask],
          createdAt: baseTime,
          updatedAt: new Date('2024-01-01T11:00:00Z')
        },
        lastSync: 0
      };

      const resolution = conflictResolver.resolveProjectConflict(conflict);

      expect(resolution.strategy).toBe('merge');
      expect(resolution.resolved.title).toBe('Remote Project'); // Remote is newer
      expect(resolution.resolved.subtasks).toHaveLength(2); // Subtasks merged
    });
  });

  describe('Care Task Conflict Resolution', () => {
    it('should prefer incomplete task when one is completed', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');

      const conflict: ConflictData<PlantCareTask> = {
        local: {
          id: 'task1',
          plantId: 'plant1',
          title: 'Water plant',
          dueDate: baseTime,
          completed: true,
          createdAt: baseTime,
          updatedAt: baseTime
        },
        remote: {
          id: 'task1',
          plantId: 'plant1',
          title: 'Water plant',
          dueDate: baseTime,
          completed: false,
          createdAt: baseTime,
          updatedAt: baseTime
        },
        lastSync: 0
      };

      const resolution = conflictResolver.resolveCareTaskConflict(conflict);

      expect(resolution.strategy).toBe('remote');
      expect(resolution.resolved.completed).toBe(false);
    });

    it('should use timestamp resolution when completion status is same', () => {
      const older = new Date('2024-01-01T10:00:00Z');
      const newer = new Date('2024-01-01T11:00:00Z');

      const conflict: ConflictData<PlantCareTask> = {
        local: {
          id: 'task1',
          plantId: 'plant1',
          title: 'Local title',
          dueDate: older,
          completed: false,
          createdAt: older,
          updatedAt: newer
        },
        remote: {
          id: 'task1',
          plantId: 'plant1',
          title: 'Remote title',
          dueDate: older,
          completed: false,
          createdAt: older,
          updatedAt: older
        },
        lastSync: 0
      };

      const resolution = conflictResolver.resolveCareTaskConflict(conflict);

      expect(resolution.strategy).toBe('local');
      expect(resolution.resolved.title).toBe('Local title');
    });
  });

  describe('Subtask Conflict Resolution', () => {
    it('should prefer subtask with more progress', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z');

      const conflict: ConflictData<Subtask> = {
        local: {
          id: 'subtask1',
          projectId: 'project1',
          title: 'Subtask',
          status: 'finished',
          createdAt: baseTime,
          updatedAt: baseTime
        },
        remote: {
          id: 'subtask1',
          projectId: 'project1',
          title: 'Subtask',
          status: 'in_progress',
          createdAt: baseTime,
          updatedAt: baseTime
        },
        lastSync: 0
      };

      const resolution = conflictResolver.resolveSubtaskConflict(conflict);

      expect(resolution.strategy).toBe('local');
      expect(resolution.resolved.status).toBe('finished');
    });

    it('should use timestamp resolution when progress is same', () => {
      const older = new Date('2024-01-01T10:00:00Z');
      const newer = new Date('2024-01-01T11:00:00Z');

      const conflict: ConflictData<Subtask> = {
        local: {
          id: 'subtask1',
          projectId: 'project1',
          title: 'Local title',
          status: 'todo',
          createdAt: older,
          updatedAt: older
        },
        remote: {
          id: 'subtask1',
          projectId: 'project1',
          title: 'Remote title',
          status: 'todo',
          createdAt: older,
          updatedAt: newer
        },
        lastSync: 0
      };

      const resolution = conflictResolver.resolveSubtaskConflict(conflict);

      expect(resolution.strategy).toBe('remote');
      expect(resolution.resolved.title).toBe('Remote title');
    });
  });

  describe('Simple Task Conflict Resolution', () => {
    it('should use timestamp resolution for simple tasks', () => {
      const older = new Date('2024-01-01T10:00:00Z');
      const newer = new Date('2024-01-01T11:00:00Z');

      const conflict: ConflictData<SimpleTask> = {
        local: {
          id: 'task1',
          userId: 'user1',
          title: 'Local Task',
          completed: false,
          createdAt: older,
          updatedAt: newer
        },
        remote: {
          id: 'task1',
          userId: 'user1',
          title: 'Remote Task',
          completed: true,
          createdAt: older,
          updatedAt: older
        },
        lastSync: 0
      };

      const resolution = conflictResolver.resolveSimpleTaskConflict(conflict);

      expect(resolution.strategy).toBe('local');
      expect(resolution.resolved.title).toBe('Local Task');
      expect(resolution.resolved.completed).toBe(false);
    });
  });
});