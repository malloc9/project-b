import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

// Mock the translation hook
vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  })
}));

// Mock BuildInfo to simplify test
vi.mock('../../../components/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../components/common')>();
  return {
    ...actual,
    BuildInfo: () => <div data-testid="build-info-mock">Build Info</div>,
  };
});

describe('Sidebar Integration', () => {
  it('should render the BuildInfo component in the footer', () => {
    render(
      <BrowserRouter>
        <Sidebar isOpen={true} onClose={() => {}} />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('build-info-mock')).toBeInTheDocument();
  });
});
