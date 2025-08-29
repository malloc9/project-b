import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  QueryConstraint,
  QueryFieldFilterConstraint,
  QueryOrderByConstraint,
  type DocumentData,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type UploadMetadata,
} from 'firebase/storage';
import { db, storage } from '../config/firebase';

/**
 * Generic Firestore service for CRUD operations
 */
export class FirestoreService {
  /**
   * Get a document by ID
   */
  static async getDocument<T>(collectionPath: string, docId: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionPath, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  /**
   * Get multiple documents with optional query constraints
   */
  static async getDocuments<T>(
    collectionPath: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    try {
      const collectionRef = collection(db, collectionPath);
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  }

  /**
   * Create a new document
   */
  static async createDocument<T extends DocumentData>(
    collectionPath: string,
    data: T
  ): Promise<string> {
    try {
      const collectionRef = collection(db, collectionPath);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  /**
   * Update an existing document
   */
  static async updateDocument<T extends Partial<DocumentData>>(
    collectionPath: string,
    docId: string,
    data: T
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(collectionPath: string, docId: string): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get user-specific collection path
   */
  static getUserCollectionPath(userId: string, collection: string): string {
    return `users/${userId}/${collection}`;
  }
}

/**
 * Firebase Storage service for file operations
 */
export class StorageService {
  /**
   * Upload a file to Firebase Storage
   */
  static async uploadFile(
    filePath: string,
    file: File,
    metadata?: UploadMetadata
  ): Promise<string> {
    try {
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Firebase Storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get user-specific file path for plant photos
   */
  static getPlantPhotoPath(userId: string, plantId: string, photoId: string, extension: string): string {
    return `users/${userId}/plants/${plantId}/photos/${photoId}.${extension}`;
  }
}

/**
 * Helper functions for common query constraints
 */
export const QueryHelpers = {
  /**
   * Create a where constraint for user-owned documents
   */
  whereUser: (userId: string): QueryFieldFilterConstraint => where('userId', '==', userId),
  
  /**
   * Create an order by constraint for creation date
   */
  orderByCreated: (direction: 'asc' | 'desc' = 'desc'): QueryOrderByConstraint => orderBy('createdAt', direction),
  
  /**
   * Create an order by constraint for due date
   */
  orderByDueDate: (direction: 'asc' | 'desc' = 'asc'): QueryOrderByConstraint => orderBy('dueDate', direction),
  
  /**
   * Create a where constraint for task status
   */
  whereStatus: (status: string): QueryFieldFilterConstraint => where('status', '==', status),
  
  /**
   * Create a where constraint for completed tasks
   */
  whereCompleted: (completed: boolean): QueryFieldFilterConstraint => where('completed', '==', completed),
};