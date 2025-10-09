// TypeScript types for translation keys - Generated from actual translation files
export interface TranslationKeys {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    create: string;
    update: string;
    remove: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    yes: string;
    no: string;
    ok: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    search: string;
    filter: string;
    sort: string;
    view: string;
    details: string;
    settings: string;
    help: string;
    about: string;
    home: string;
    name: string;
    description: string;
    date: string;
    time: string;
    status: string;
    type: string;
    category: string;
    priority: string;
    actions: string;
    language: string;
    lang: string;
    selectLanguage: string;
    currentLanguage: string;
    availableLanguages: string;
    languageChanged: string;
    selectLanguageOption: string;
    selectedLanguage: string;
    appTitle: string;
    appDescription: string;
    appKeywords: string;
    invalidDate: string;
    invalidTime: string;
  };
  navigation: {
    dashboard: string;
    plants: string;
    projects: string;
    tasks: string;
    calendar: string;
    profile: string;
    logout: string;
    menu: string;
    toggleMenu: string;
    mainNavigation: string;
    userMenu: string;
    plantCodex: string;
    signOut: string;
    openMainMenu: string;
    closeSidebar: string;
    homeManager: string;
    householdManagement: string;
    overviewAndQuickAccess: string;
    managePlantsAndPhotos: string;
    householdProjectsAndSubtasks: string;
    simpleTaskManagement: string;
    viewAllScheduledItems: string;
    welcomeToDashboard: string;
    openNavigationMenu: string;
    user: string;
    version: string;
  };
  auth: {
    signIn: string;
    signOut: string;
    login: string;
    logout: string;
    email: string;
    emailAddress: string;
    password: string;
    enterEmail: string;
    enterPassword: string;
    signingIn: string;
    createTestAccount: string;
    creatingAccount: string;
    forgotPassword: string;
    resetPassword: string;
    resetPasswordDescription: string;
    sendResetEmail: string;
    sending: string;
    passwordResetEmailSent: string;
    checkEmailForInstructions: string;
    backToSignIn: string;
    secureAuthenticationPoweredBy: string;
    householdManagementTitle: string;
    managePlantsProjectsTasks: string;
    validation: {
      emailRequired: string;
      validEmailRequired: string;
      passwordRequired: string;
      loginFailed: string;
      signupFailed: string;
      passwordResetFailed: string;
    };
  };
  dashboard: {
    overview: string;
    stats: {
      plantsTracked: string;
      activeProjects: string;
      pendingTasks: string;
      thisWeek: string;
      activePlantsInCodex: string;
      projectsInProgress: string;
      tasksAwaitingCompletion: string;
      upcomingDeadlines: string;
    };
    recentActivity: string;
    recentActivitySubtitle: string;
    recentActivitiesWillAppear: string;
    startByAddingPlants: string;
    upcomingItems: string;
    upcomingItemsSubtitle: string;
    noUpcomingItemsScheduled: string;
    plantCareRemindersWillShow: string;
    gettingStarted: string;
    gettingStartedSubtitle: string;
    tips: {
      addFirstPlant: string;
      addFirstPlantDescription: string;
      createProject: string;
      createProjectDescription: string;
      syncCalendar: string;
      syncCalendarDescription: string;
    };
  };
  forms: {
    labels: {
      title: string;
      description: string;
      dueDate: string;
      status: string;
      projectTitle: string;
      plantName: string;
      species: string;
      photo: string;
      photoDescription: string;
      taskTitle: string;
      every: string;
      period: string;
      endDate: string;
      careTasks: string;
      recurrence: string;
    };
    placeholders: {
      enterTitle: string;
      enterDescription: string;
      enterPlantName: string;
      enterSpecies: string;
      enterTaskTitle: string;
      selectDate: string;
      selectStatus: string;
      optional: string;
    };
    buttons: {
      save: string;
      cancel: string;
      delete: string;
      add: string;
      edit: string;
      create: string;
      update: string;
      upload: string;
      submit: string;
    };
    validation: {
      required: string;
      titleRequired: string;
      descriptionRequired: string;
      dueDateRequired: string;
      taskTitleRequired: string;
      plantNameRequired: string;
      titleTooLong: string;
      descriptionTooLong: string;
      invalidDate: string;
      invalidEmail: string;
      fieldRequired: string;
      fieldTooLong: string;
      fieldTooShort: string;
    };
    status: {
      notStarted: string;
      inProgress: string;
      completed: string;
      cancelled: string;
      onHold: string;
    };
    recurrence: {
      none: string;
      daily: string;
      weekly: string;
      monthly: string;
      yearly: string;
      days: string;
      weeks: string;
      months: string;
      years: string;
    };
  };
  errors: {
    general: {
      unknownError: string;
      networkError: string;
      serverError: string;
      notFound: string;
      unauthorized: string;
      forbidden: string;
      timeout: string;
      connectionLost: string;
    };
    auth: {
      loginFailed: string;
      invalidCredentials: string;
      accountLocked: string;
      passwordExpired: string;
      emailNotVerified: string;
      userNotFound: string;
      emailAlreadyExists: string;
    };
    validation: {
      fieldRequired: string;
      invalidEmail: string;
      passwordTooShort: string;
      passwordsNotMatch: string;
      invalidPhoneNumber: string;
      invalidDate: string;
    };
    data: {
      loadFailed: string;
      saveFailed: string;
      deleteFailed: string;
      updateFailed: string;
      notFound: string;
      alreadyExists: string;
    };
  };
}

// Language configuration interface
export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dateFormat: string;
  timeFormat: string;
  rtl: boolean;
}

// Supported languages configuration
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: 'hu',
    name: 'Hungarian',
    nativeName: 'Magyar',
    flag: '🇭🇺',
    dateFormat: 'yyyy.MM.dd',
    timeFormat: 'HH:mm',
    rtl: false,
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'h:mm a',
    rtl: false,
  },
];

// Type for translation function with namespace support
export type TranslationFunction = (
  key: string,
  options?: {
    ns?: string;
    defaultValue?: string;
    count?: number;
    context?: string;
    [key: string]: any;
  }
) => string;

// Type for language change function
export type LanguageChangeFunction = (language: string) => Promise<void>;

// Namespace type definitions for better type safety
export type Namespace = keyof TranslationKeys;

// Nested key path types for type-safe translation access
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

// Type for all possible translation keys with namespace prefixes
export type TranslationKey = 
  | `common.${NestedKeyOf<TranslationKeys['common']>}`
  | `navigation.${NestedKeyOf<TranslationKeys['navigation']>}`
  | `auth.${NestedKeyOf<TranslationKeys['auth']>}`
  | `dashboard.${NestedKeyOf<TranslationKeys['dashboard']>}`
  | `forms.${NestedKeyOf<TranslationKeys['forms']>}`
  | `errors.${NestedKeyOf<TranslationKeys['errors']>}`;

// Export namespace-specific key types for easier access
export type CommonKeys = keyof TranslationKeys['common'];
export type NavigationKeys = keyof TranslationKeys['navigation'];
export type AuthKeys = keyof TranslationKeys['auth'];
export type DashboardKeys = keyof TranslationKeys['dashboard'];
export type FormsKeys = keyof TranslationKeys['forms'];
export type ErrorsKeys = keyof TranslationKeys['errors'];

// Nested key types for complex objects
export type AuthValidationKeys = keyof TranslationKeys['auth']['validation'];
export type DashboardStatsKeys = keyof TranslationKeys['dashboard']['stats'];
export type DashboardTipsKeys = keyof TranslationKeys['dashboard']['tips'];
export type FormsLabelsKeys = keyof TranslationKeys['forms']['labels'];
export type FormsPlaceholdersKeys = keyof TranslationKeys['forms']['placeholders'];
export type FormsButtonsKeys = keyof TranslationKeys['forms']['buttons'];
export type FormsValidationKeys = keyof TranslationKeys['forms']['validation'];
export type FormsStatusKeys = keyof TranslationKeys['forms']['status'];
export type FormsRecurrenceKeys = keyof TranslationKeys['forms']['recurrence'];
export type ErrorsGeneralKeys = keyof TranslationKeys['errors']['general'];
export type ErrorsAuthKeys = keyof TranslationKeys['errors']['auth'];
export type ErrorsValidationKeys = keyof TranslationKeys['errors']['validation'];
export type ErrorsDataKeys = keyof TranslationKeys['errors']['data'];

// Type-safe translation function with better intellisense
export interface TypedTranslationFunction {
  // Namespace-based translation
  <T extends Namespace>(key: string, options?: TranslationOptions & { ns: T }): string;
  
  // Direct key translation (assumes current namespace)
  (key: string, options?: TranslationOptions): string;
  
  // Interpolation with type safety
  (key: string, options: TranslationOptions & { 
    count?: number;
    [key: string]: string | number | boolean | undefined;
  }): string;
}

// Enhanced translation options interface
export interface TranslationOptions {
  ns?: Namespace;
  defaultValue?: string;
  count?: number;
  context?: string;
  interpolation?: {
    escapeValue?: boolean;
    format?: (value: any, format: string, lng: string) => string;
  };
  [key: string]: any;
}

// Error handling types
export interface TranslationError {
  type: 'MISSING_KEY' | 'LOADING_ERROR' | 'NAMESPACE_ERROR' | 'INTERPOLATION_ERROR';
  key: string;
  namespace?: string;
  message: string;
  fallbackUsed?: boolean;
}

export interface TranslationErrorHandler {
  onError: (error: TranslationError) => void;
  onMissingKey: (key: string, namespace?: string) => string;
  onLoadingError: (namespace: string, error: Error) => void;
}