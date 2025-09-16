/**
 * Base64 Storage Service - Store images as base64 strings in Firestore
 * This is free and works within Firestore document size limits (1MB per document)
 */

import { compressImage } from '../utils/imageUtils';

export class Base64StorageService {
  /**
   * Convert file to base64 and compress for storage
   */
  static async uploadFile(
    _filePath: string, // Not used but kept for interface compatibility
    file: File,
    _metadata?: any
  ): Promise<string> {
    try {
      // Compress and resize image to keep under Firestore limits
      const compressedFile = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'jpeg'
      });

      // Convert to base64
      const base64String = await this.fileToBase64(compressedFile);
      
      // Return base64 data URL
      return base64String;
    } catch (error) {
      console.error('Error converting file to base64:', error);
      throw error;
    }
  }

  /**
   * Delete file (no-op for base64 storage)
   */
  static async deleteFile(_filePath: string): Promise<void> {
    // No action needed for base64 storage
    // Images are deleted when the document is updated
    return Promise.resolve();
  }

  /**
   * Get plant photo path (returns a unique identifier)
   */
  static getPlantPhotoPath(userId: string, plantId: string, photoId: string, extension: string): string {
    return `${userId}/${plantId}/${photoId}.${extension}`;
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
   * Create thumbnail from base64 image
   */
  static async createThumbnail(base64Image: string, maxSize: number = 150): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate thumbnail dimensions
        const { width, height } = this.calculateThumbnailSize(img.width, img.height, maxSize);
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64
        const thumbnailBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnailBase64);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64Image;
    });
  }

  /**
   * Calculate thumbnail dimensions maintaining aspect ratio
   */
  private static calculateThumbnailSize(originalWidth: number, originalHeight: number, maxSize: number) {
    let width = originalWidth;
    let height = originalHeight;

    if (width > height) {
      if (width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  /**
   * Validate base64 image size (Firestore has 1MB document limit)
   */
  static validateImageSize(base64String: string, maxSizeKB: number = 500): boolean {
    // Base64 encoding increases size by ~33%, so we need to account for that
    const sizeInBytes = (base64String.length * 3) / 4;
    const sizeInKB = sizeInBytes / 1024;
    
    return sizeInKB <= maxSizeKB;
  }

  /**
   * Get image dimensions from base64 string
   */
  static getImageDimensions(base64String: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64String;
    });
  }
}