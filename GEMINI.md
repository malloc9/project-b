# Gemini Project: Household Management Application

## Project Overview

This is a comprehensive property and household management application built with **React 19** and **TypeScript**. The project uses **Vite** for a fast development environment and build process. The user interface is styled with **Tailwind CSS** for a responsive, mobile-first design. **Firebase** is used for backend services, including authentication, Firestore database, and cloud functions. The application also supports internationalization using **i18next**.

The project is structured with a clear separation of concerns, with components, contexts, hooks, services, and types organized into their respective directories.

## Key Technologies

- **Frontend:** React 19, TypeScript, Vite, React Router, Tailwind CSS
- **Backend:** Firebase (Authentication, Firestore, Cloud Functions)
- **Testing:** Vitest, React Testing Library
- **Internationalization:** i18next

## Building and Running

### Development

To start the development server, run:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

To build the application for production, run:

```bash
npm run build
```

The production build will be located in the `dist` directory.

### Testing

To run the test suite, use one of the following commands:

- `npm test`: Run tests in watch mode.
- `npm run test:run`: Run tests once.
- `npm run test:ui`: Run tests with the Vitest UI.

## Deployment

The project is configured for deployment with Firebase. The following scripts are available:

- `npm run firebase:deploy`: Deploys the application, including hosting and functions.
- `npm run firebase:deploy:hosting`: Deploys only the hosting to Firebase.
- `npm run deploy:staging`: Deploys to the staging environment.
- `npm run deploy:production`: Deploys to the production environment.

## Development Conventions

- **Coding Style:** The project uses ESLint for code linting. Run `npm run lint` to check for issues.
- **Testing:** The project uses Vitest and React Testing Library for testing. Test files are located alongside the source files in `__tests__` directories.
- **Internationalization:** Text in the application should be translated using the `useTranslation` hook from `react-i18next`. Translation files are located in the `src/i18n/resources` directory.
- **Service Worker:** The project includes a service worker for caching and offline capabilities, with cache-busting handled by a custom Vite plugin.
