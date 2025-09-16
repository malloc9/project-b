/**
 * Cloudinary Storage Service - Free tier with 25GB storage and bandwidth
 * Sign up at https://cloudinary.com for free account
 */

export class CloudinaryStorageService {
  private static readonly CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  private static readonly UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  private static readonly API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;

  /**
   * Upload file to Cloudinary
   */
  static async uploadFile(
    filePath: string,
    file: File,
    _metadata?: any
  ): Promise<string> {
    try {
      if (!this.CLOUD_NAME || !this.UPLOAD_PRESET) {
        throw new Error('Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.UPLOAD_PRESET);
      
      // Add folder structure based on filePath
      const folder = this.extractFolderFromPath(filePath);
      if (folder) {
        formData.append('folder', folder);
      }

      // Add public_id for consistent naming
      const publicId = this.extractPublicIdFromPath(filePath);
      if (publicId) {
        formData.append('public_id', publicId);
      }

      // Add transformation for automatic optimization
      formData.append('transformation', 'q_auto,f_auto');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete file from Cloudinary
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      if (!this.API_KEY || !this.CLOUD_NAME) {
        console.warn('Cloudinary API key not configured, skipping deletion');
        return;
      }

      const publicId = this.extractPublicIdFromPath(filePath);
      if (!publicId) {
        console.warn('Could not extract public_id from path:', filePath);
        return;
      }

      // Note: For security, deletion should ideally be done server-side
      // This is a client-side deletion which requires unsigned deletion to be enabled
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('api_key', this.API_KEY);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/destroy`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        console.warn('Failed to delete from Cloudinary:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      // Don't throw error for deletion failures
    }
  }

  /**
   * Get plant photo path
   */
  static getPlantPhotoPath(userId: string, plantId: string, photoId: string, _extension: string): string {
    return `users/${userId}/plants/${plantId}/photos/${photoId}`;
  }

  /**
   * Generate optimized image URL with transformations
   */
  static getOptimizedImageUrl(
    originalUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'auto' | 'webp' | 'jpg' | 'png';
      crop?: 'fill' | 'fit' | 'scale' | 'crop';
    } = {}
  ): string {
    if (!originalUrl.includes('cloudinary.com')) {
      return originalUrl;
    }

    const {
      width,
      height,
      quality = 'auto',
      format = 'auto',
      crop = 'fill'
    } = options;

    // Build transformation string
    const transformations = [];
    
    if (width || height) {
      let sizeTransform = 'c_' + crop;
      if (width) sizeTransform += `,w_${width}`;
      if (height) sizeTransform += `,h_${height}`;
      transformations.push(sizeTransform);
    }
    
    transformations.push(`q_${quality}`);
    transformations.push(`f_${format}`);

    // Insert transformations into URL
    const transformString = transformations.join(',');
    return originalUrl.replace('/upload/', `/upload/${transformString}/`);
  }

  /**
   * Create thumbnail URL
   */
  static getThumbnailUrl(originalUrl: string, size: number = 150): string {
    return this.getOptimizedImageUrl(originalUrl, {
      width: size,
      height: size,
      crop: 'fill',
      quality: 80
    });
  }

  /**
   * Extract folder path from file path
   */
  private static extractFolderFromPath(filePath: string): string {
    const parts = filePath.split('/');
    parts.pop(); // Remove filename
    return parts.join('/');
  }

  /**
   * Extract public_id from file path
   */
  private static extractPublicIdFromPath(filePath: string): string {
    return filePath.replace(/\.[^/.]+$/, ''); // Remove extension
  }

  /**
   * Check if Cloudinary is properly configured
   */
  static isConfigured(): boolean {
    return !!(this.CLOUD_NAME && this.UPLOAD_PRESET);
  }
}