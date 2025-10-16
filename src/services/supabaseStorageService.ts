/**
 * Supabase Storage Service - Free tier with 1GB storage
 * Sign up at https://supabase.com for free account
 * Install: npm install @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js';

export class SupabaseStorageService {
  private static readonly SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  private static readonly SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  private static readonly BUCKET_NAME = 'plant-photos';

  private static _supabase: ReturnType<typeof createClient> | null = null;

  private static get supabase() {
    if (!this._supabase) {
      if (!this.SUPABASE_URL || !this.SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      }
      this._supabase = createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
    }
    return this._supabase;
  }

  /**
   * Upload file to Supabase Storage
   */
  static async uploadFile(
    filePath: string,
    file: File,
    metadata?: any
  ): Promise<string> {
    try {
      if (!this.SUPABASE_URL || !this.SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      }

      const { error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          ...metadata
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
      throw error;
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      if (!this.SUPABASE_URL || !this.SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured, skipping deletion');
        return;
      }

      const { error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting from Supabase:', error);
      }
    } catch (error) {
      console.error('Error deleting from Supabase:', error);
    }
  }

  /**
   * Get plant photo path
   */
  static getPlantPhotoPath(userId: string, plantId: string, photoId: string, extension: string): string {
    return `users/${userId}/plants/${plantId}/photos/${photoId}.${extension}`;
  }

  /**
   * Get optimized image URL with transformations
   */
  static getOptimizedImageUrl(
    originalUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpg' | 'png';
    } = {}
  ): string {
    if (!originalUrl.includes('supabase')) {
      return originalUrl;
    }

    const { width, height, quality, format } = options;
    const params = new URLSearchParams();

    if (width) params.append('width', width.toString());
    if (height) params.append('height', height.toString());
    if (quality) params.append('quality', quality.toString());
    if (format) params.append('format', format);

    if (params.toString()) {
      return `${originalUrl}?${params.toString()}`;
    }

    return originalUrl;
  }

  /**
   * Create thumbnail URL
   */
  static getThumbnailUrl(originalUrl: string, size: number = 150): string {
    return this.getOptimizedImageUrl(originalUrl, {
      width: size,
      height: size,
      quality: 80
    });
  }

  /**
   * Check if Supabase is properly configured
   */
  static isConfigured(): boolean {
    return !!(this.SUPABASE_URL && this.SUPABASE_ANON_KEY);
  }
}