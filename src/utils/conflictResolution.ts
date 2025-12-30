import type { Plant, Project, SimpleTask, PlantCareTask, Subtask } from '../types';

export interface ConflictData<T> {
  local: T;
  remote: T;
  lastSync: number;
}

export interface ConflictResolution<T> {
  resolved: T;
  strategy: 'local' | 'remote' | 'merge' | 'manual';
}

export type ConflictResolver<T> = (conflict: ConflictData<T>) => ConflictResolution<T>;

// Base conflict resolution strategies
export class ConflictResolutionManager {
  
  // Resolve conflicts based on timestamp (last modified wins)
  resolveByTimestamp<T extends { updatedAt: Date }>(
    conflict: ConflictData<T>
  ): ConflictResolution<T> {
    const localTime = new Date(conflict.local.updatedAt).getTime();
    const remoteTime = new Date(conflict.remote.updatedAt).getTime();
    
    if (localTime > remoteTime) {
      return {
        resolved: conflict.local,
        strategy: 'local'
      };
    } else {
      return {
        resolved: conflict.remote,
        strategy: 'remote'
      };
    }
  }

  // Resolve plant conflicts with field-level merging
  resolvePlantConflict(conflict: ConflictData<Plant>): ConflictResolution<Plant> {
    const { local, remote } = conflict;
    
    // If one is significantly newer, use timestamp resolution
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();
    const timeDiff = Math.abs(localTime - remoteTime);
    
    // If more than 1 hour difference, use newer version
    if (timeDiff > 60 * 60 * 1000) {
      return this.resolveByTimestamp(conflict);
    }
    
    // Otherwise, merge fields intelligently
    const merged: Plant = {
      ...remote, // Start with remote as base
      id: local.id, // Keep local ID
      userId: local.userId, // Keep local user ID
      
      // Merge string fields (prefer non-empty values)
      name: local.name.trim() || remote.name,
      species: local.species?.trim() || remote.species || undefined,
      description: this.mergeDescriptions(local.description, remote.description),
      
      // Merge arrays (combine and deduplicate)
      photos: this.mergePhotos(local.photos, remote.photos),
      careTasks: this.mergeCareTasks(local.careTasks, remote.careTasks),
      
      // Use latest timestamp
      updatedAt: localTime > remoteTime ? local.updatedAt : remote.updatedAt
    };
    
    return {
      resolved: merged,
      strategy: 'merge'
    };
  }

  // Resolve project conflicts
  resolveProjectConflict(conflict: ConflictData<Project>): ConflictResolution<Project> {
    const { local, remote } = conflict;
    
    // Use timestamp resolution for projects (simpler than plants)
    const timestampResolution = this.resolveByTimestamp(conflict);
    
    // But merge subtasks if both have them
    if (local.subtasks.length > 0 && remote.subtasks.length > 0) {
      const merged: Project = {
        ...timestampResolution.resolved,
        subtasks: this.mergeSubtasks(local.subtasks, remote.subtasks)
      };
      
      return {
        resolved: merged,
        strategy: 'merge'
      };
    }
    
    return timestampResolution;
  }

  // Resolve simple task conflicts
  resolveSimpleTaskConflict(conflict: ConflictData<SimpleTask>): ConflictResolution<SimpleTask> {
    // Simple tasks use timestamp resolution
    return this.resolveByTimestamp(conflict);
  }

  // Resolve care task conflicts
  resolveCareTaskConflict(conflict: ConflictData<PlantCareTask>): ConflictResolution<PlantCareTask> {
    const { local, remote } = conflict;
    
    // For care tasks, prefer the version that's not completed if one is completed
    if (local.completed !== remote.completed) {
      return {
        resolved: local.completed ? remote : local,
        strategy: local.completed ? 'remote' : 'local'
      };
    }
    
    // Use updatedAt for timestamp comparison
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();
    
    return {
      resolved: localTime > remoteTime ? local : remote,
      strategy: localTime > remoteTime ? 'local' : 'remote'
    };
  }

  // Resolve subtask conflicts
  resolveSubtaskConflict(conflict: ConflictData<Subtask>): ConflictResolution<Subtask> {
    const { local, remote } = conflict;
    
    // For subtasks, prefer the version with more progress
    const localProgress = this.getTaskProgress(local.status);
    const remoteProgress = this.getTaskProgress(remote.status);
    
    if (localProgress !== remoteProgress) {
      return {
        resolved: localProgress > remoteProgress ? local : remote,
        strategy: localProgress > remoteProgress ? 'local' : 'remote'
      };
    }
    
    return this.resolveByTimestamp(conflict);
  }

  // Helper methods for merging
  private mergeDescriptions(local: string, remote: string): string {
    if (!local.trim()) return remote;
    if (!remote.trim()) return local;
    
    // If they're very similar, use the longer one
    if (this.calculateSimilarity(local, remote) > 0.8) {
      return local.length > remote.length ? local : remote;
    }
    
    // Otherwise, combine them
    return `${local}\n\n[Merged from sync]: ${remote}`;
  }

  private mergePhotos(local: any[], remote: any[]): any[] {
    const merged = [...local];
    
    for (const remotePhoto of remote) {
      const exists = merged.find(p => p.id === remotePhoto.id);
      if (!exists) {
        merged.push(remotePhoto);
      }
    }
    
    // Sort by upload date
    return merged.sort((a, b) => 
      new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );
  }

  private mergeCareTasks(local: PlantCareTask[], remote: PlantCareTask[]): PlantCareTask[] {
    const merged = [...local];
    
    for (const remoteTask of remote) {
      const existingIndex = merged.findIndex(t => t.id === remoteTask.id);
      if (existingIndex >= 0) {
        // Resolve individual task conflict
        const taskConflict: ConflictData<PlantCareTask> = {
          local: merged[existingIndex],
          remote: remoteTask,
          lastSync: 0 // Not used for individual tasks
        };
        const resolution = this.resolveCareTaskConflict(taskConflict);
        merged[existingIndex] = resolution.resolved;
      } else {
        merged.push(remoteTask);
      }
    }
    
    return merged;
  }

  private mergeSubtasks(local: Subtask[], remote: Subtask[]): Subtask[] {
    const merged = [...local];
    
    for (const remoteSubtask of remote) {
      const existingIndex = merged.findIndex(s => s.id === remoteSubtask.id);
      if (existingIndex >= 0) {
        // Resolve individual subtask conflict
        const subtaskConflict: ConflictData<Subtask> = {
          local: merged[existingIndex],
          remote: remoteSubtask,
          lastSync: 0
        };
        const resolution = this.resolveSubtaskConflict(subtaskConflict);
        merged[existingIndex] = resolution.resolved;
      } else {
        merged.push(remoteSubtask);
      }
    }
    
    return merged;
  }

  private getTaskProgress(status: string): number {
    switch (status) {
      case 'todo': return 0;
      case 'in_progress': return 1;
      case 'finished': return 2;
      default: return 0;
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

export const conflictResolver = new ConflictResolutionManager();