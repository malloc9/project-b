/**
 * Unified Storage Service - Abstraction layer for different storage providers
 * Allows switching between storage providers without changing application code
 */

import { Base64StorageService } from './base64StorageService';
import { CloudinaryStorageService } from './cloudinaryStorageService';
import { ImgBBStorageService } from './imgbbStorageService';
import { SupabaseStorageService } from './supabaseStorageService';

export type StorageProvider = 'base64' | 'cloudinary' | 'imgbb' | 'supabase' | 'firebase';

interface StorageServiceInterface {
  uploadFile(filePath: string, file: File, metadata?: any): Promise<string>;
  deleteFile(filePath: string): Promise<void>;
  getPlantPhotoPath(userId: string, plantId: string, photoId: string, extension: string): string;
}

export class UnifiedStorageService {
  private static readonly STORAGE_PROVIDER: StorageProvider = 
    (import.meta.env.VITE_STORAGE_PROVIDER as StorageProvider) || 'base64';

  /**
   * Get the appropriate storage service based on configuration
   */
  private static getStorageService(): StorageServiceInterface {
    switch (this.STORAGE_PROVIDER) {
      case 'cloudinary':
        if (CloudinaryStorageService.isConfigured()) {
          return CloudinaryStorageService;
        }
        console.warn('Cloudinary not configured, falling back to base64 storage');
        return Base64StorageService;

      case 'imgbb':
        if (ImgBBStorageService.isConfigured()) {
          return ImgBBStorageService;
        }
        console.warn('ImgBB not configured, falling back to base64 storage');
        return Base64StorageService;

      case 'supabase':
        if (SupabaseStorageService.isConfigured()) {
          return SupabaseStorageService;
        }
        console.warn('Supabase not configured, falling back to base64 storage');
        return Base64StorageService;

      case 'firebase':
        // Import Firebase storage dynamically to avoid errors when not using it
        console.warn('Firebase Storage not available in free tier, falling back to base64 storage');
        return Base64StorageService;

      case 'base64':
      default:
        return Base64StorageService;
    }
  }

  /**
   * Upload file using the configured storage provider
   */
  static async uploadFile(
    filePath: string,
    file: File,
    metadata?: any
  ): Promise<string> {
    const service = this.getStorageService();
    return service.uploadFile(filePath, file, metadata);
  }

  /**
   * Delete file using the configured storage provider
   */
  static async deleteFile(filePath: string): Promise<void> {
    const service = this.getStorageService();
    return service.deleteFile(filePath);
  }

  /**
   * Get plant photo path using the configured storage provider
   */
  static getPlantPhotoPath(userId: string, plantId: string, photoId: string, extension: string): string {
    const service = this.getStorageService();
    return service.getPlantPhotoPath(userId, plantId, photoId, extension);
  }

  /**
   * Get optimized image URL (provider-specific)
   */
  static getOptimizedImageUrl(
    originalUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    } = {}
  ): string {
    switch (this.STORAGE_PROVIDER) {
      case 'cloudinary':
        return CloudinaryStorageService.getOptimizedImageUrl(originalUrl, options);
      
      case 'supabase':
        return SupabaseStorageService.getOptimizedImageUrl(originalUrl, options);
      
      case 'base64':
      case 'imgbb':
      case 'firebase':
      default:
        return originalUrl;
    }
  }

  /**
   * Get thumbnail URL (provider-specific)
   */
  static getThumbnailUrl(originalUrl: string, size: number = 150): string {
    switch (this.STORAGE_PROVIDER) {
      case 'cloudinary':
        return CloudinaryStorageService.getThumbnailUrl(originalUrl, size);
      
      case 'imgbb':
        return ImgBBStorageService.getThumbnailUrl(originalUrl, 'thumb');
      
      case 'supabase':
        return SupabaseStorageService.getThumbnailUrl(originalUrl, size);
      
      case 'base64':
        // For base64, we'll need to generate thumbnails client-side
        return originalUrl; // Return original for now
      
      case 'firebase':
      default:
        return originalUrl;
    }
  }

  /**
   * Get current storage provider
   */
  static getProvider(): StorageProvider {
    return this.STORAGE_PROVIDER;
  }

  /**
   * Check if current provider supports optimization
   */
  static supportsOptimization(): boolean {
    return ['cloudinary', 'supabase'].includes(this.STORAGE_PROVIDER);
  }

  /**
   * Check if current provider supports thumbnails
   */
  static supportsThumbnails(): boolean {
    return ['cloudinary', 'imgbb', 'supabase'].includes(this.STORAGE_PROVIDER);
  }

  /**
   * Get storage provider info
   */
  static getProviderInfo(): {
    name: string;
    description: string;
    freeLimit: string;
    features: string[];
  } {
    switch (this.STORAGE_PROVIDER) {
      case 'base64':
        return {
          name: 'Base64 (Firestore)',
          description: 'Images stored as base64 strings in Firestore documents',
          freeLimit: '~500KB per image (Firestore document limit)',
          features: ['Completely free', 'No external dependencies', 'Works offline']
        };

      case 'cloudinary':
        return {
          name: 'Cloudinary',
          description: 'Professional image and video management service',
          freeLimit: '25GB storage, 25GB bandwidth/month',
          features: ['Automatic optimization', 'Image transformations', 'CDN delivery', 'Thumbnails']
        };

      case 'imgbb':
        return {
          name: 'ImgBB',
          description: 'Free image hosting service',
          freeLimit: '32MB per image, unlimited storage',
          features: ['Simple API', 'Automatic thumbnails', 'No bandwidth limits']
        };

      case 'supabase':
        return {
          name: 'Supabase Storage',
          description: 'Open source Firebase alternative',
          freeLimit: '1GB storage, 2GB bandwidth/month',
          features: ['Image transformations', 'CDN delivery', 'Real-time updates']
        };

      case 'firebase':
      default:
        return {
          name: 'Firebase Storage',
          description: 'Google Cloud Storage for Firebase',
          freeLimit: '1GB storage, 10GB bandwidth/month (Blaze plan required)',
          features: ['Google Cloud integration', 'Security rules', 'Offline support']
        };
    }
  }
}