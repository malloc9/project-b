/**
 * ImgBB Storage Service - Free image hosting with 32MB per image limit
 * Sign up at https://imgbb.com/api for free API key
 */

export class ImgBBStorageService {
  private static readonly API_KEY = import.meta.env.VITE_IMGBB_API_KEY;
  private static readonly API_URL = 'https://api.imgbb.com/1/upload';

  /**
   * Upload file to ImgBB
   */
  static async uploadFile(
    filePath: string,
    file: File,
    _metadata?: any
  ): Promise<string> {
    try {
      if (!this.API_KEY) {
        throw new Error('ImgBB API key not configured. Please set VITE_IMGBB_API_KEY');
      }

      // Convert file to base64
      const base64String = await this.fileToBase64(file);
      
      // Remove data URL prefix
      const base64Data = base64String.split(',')[1];

      const formData = new FormData();
      formData.append('key', this.API_KEY);
      formData.append('image', base64Data);
      
      // Add name based on file path
      const fileName = this.extractFileNameFromPath(filePath);
      if (fileName) {
        formData.append('name', fileName);
      }

      const response = await fetch(this.API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ImgBB upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`ImgBB upload failed: ${result.error?.message || 'Unknown error'}`);
      }

      return result.data.url;
    } catch (error) {
      console.error('Error uploading to ImgBB:', error);
      throw error;
    }
  }

  /**
   * Delete file from ImgBB (not supported by free API)
   */
  static async deleteFile(_filePath: string): Promise<void> {
    // ImgBB free tier doesn't support deletion via API
    // Images are automatically deleted after inactivity period
    console.warn('ImgBB free tier does not support image deletion via API');
    return Promise.resolve();
  }

  /**
   * Get plant photo path
   */
  static getPlantPhotoPath(userId: string, plantId: string, photoId: string, extension: string): string {
    return `${userId}_${plantId}_${photoId}.${extension}`;
  }

  /**
   * Convert File to base64 string
   */
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Extract filename from file path
   */
  private static extractFileNameFromPath(filePath: string): string {
    return filePath.split('/').pop() || '';
  }

  /**
   * Check if ImgBB is properly configured
   */
  static isConfigured(): boolean {
    return !!this.API_KEY;
  }

  /**
   * Get thumbnail URL (ImgBB provides automatic thumbnails)
   */
  static getThumbnailUrl(originalUrl: string, size: 'thumb' | 'medium' = 'thumb'): string {
    if (!originalUrl.includes('i.ibb.co')) {
      return originalUrl;
    }

    // ImgBB automatically provides different sizes
    // thumb: 150x150, medium: 300x300
    const sizeMap = {
      thumb: 't',
      medium: 'm'
    };

    // Replace the image URL to get thumbnail
    // Example: https://i.ibb.co/abc123/image.jpg -> https://i.ibb.co/abc123/image.th.jpg
    const parts = originalUrl.split('/');
    const filename = parts[parts.length - 1];
    const nameWithoutExt = filename.split('.')[0];
    const ext = filename.split('.').pop();
    
    parts[parts.length - 1] = `${nameWithoutExt}.${sizeMap[size]}.${ext}`;
    
    return parts.join('/');
  }
}