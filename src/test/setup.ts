import './mocks/plantServiceInitializer';
import '../i18n';
import './setup-providers';

// Lightweight DOM matchers (no external deps)
function toBeInTheDocument(received: any) {
  const pass = !!received && (typeof document !== 'undefined' && (document.body.contains(received) || (received as any).isConnected));
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
