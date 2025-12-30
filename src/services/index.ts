// Service layer for Firebase and external API integrations
// This file will export all service modules

export { AuthService } from './authService';
export { FirestoreService, QueryHelpers } from './firebase';
export { PlantService } from './plantService';
export * as ProjectService from './projectService';
export * as SimpleTaskService from './simpleTaskService';
export * as CalendarService from './calendarService';
export * as OptimizedCalendarService from './optimizedCalendarService';
export { NotificationService } from './notificationService';
export { offlineCalendarService } from './offlineCalendarService';
export { realtimeCalendarService } from './realtimeCalendarService';