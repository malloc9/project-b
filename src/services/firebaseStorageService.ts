import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from '../config/firebase';

const storage = getStorage(app);

export class FirebaseStorageService {
  static isConfigured(): boolean {
    return !!(
      import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    );
  }

  static async uploadFile(filePath: string, file: File): Promise<string> {
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  static async deleteFile(filePath: string): Promise<void> {
    const storageRef = ref(storage, filePath);
    try {
      await deleteObject(storageRef);
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        console.warn(`File not found, skipping deletion: ${filePath}`);
      } else {
        throw error;
      }
    }
  }

  static getPlantPhotoPath(userId: string, plantId: string, photoId: string, extension: string): string {
    return `users/${userId}/plants/${plantId}/${photoId}.${extension}`;
  }
}
