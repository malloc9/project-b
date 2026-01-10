import './mocks/plantServiceInitializer';
import '../i18n';
import './setup-providers';

// Lightweight DOM matchers for Vitest (no external deps required)
function toBeInTheDocument(received: any) {
  const pass = !!received && (document.body.contains(received) || (received as any).isConnected);
  return { pass, message: () => `expected element to be in the document` };
}
function toHaveTextContent(received: any, text: string) {
  const content = received?.textContent ?? '';
  const pass = content.includes(text);
  return { pass, message: () => `expected element to have text content containing "${text}"` };
}
if (typeof (globalThis as any).expect !== 'undefined' && typeof (globalThis as any).expect.extend === 'function') {
  (globalThis as any).expect.extend({ toBeInTheDocument, toHaveTextContent });
}

// Global mocks for tests
if (typeof window !== 'undefined') {
  // Seed i18n language for tests that read language preference from localStorage
  try {
    localStorage.setItem('i18nextLng', 'en');
  } catch {}

  // Minimal Firebase Auth mock to satisfy onAuthStateChanged usage in tests
  if (!(window as any).firebase) {
    (window as any).firebase = {
      auth: () => ({
        onAuthStateChanged: (cb: any) => {
          cb(null); // signed-out by default
          return () => {};
        }
      }),
      initializeApp: () => {},
      apps: [] as any[]
    };
  }

  // Basic matchMedia stub for tests that rely on media queries
  if (!('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      })
    });
  }
}
