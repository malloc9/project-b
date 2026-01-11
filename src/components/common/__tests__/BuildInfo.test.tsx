import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BuildInfo from '../BuildInfo';
import { getFormattedBuildTime } from '../../../utils/buildInfo';

// Mock the buildInfo utility
vi.mock('../../../utils/buildInfo', () => ({
  getFormattedBuildTime: vi.fn(),
  getBuildTimestamp: vi.fn(() => '2026-01-11T14:30:00Z')
}));

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US' }
  })
}));

const mockGetFormattedBuildTime = vi.mocked(getFormattedBuildTime);

describe('BuildInfo', () => {
  it('should render the info icon', () => {
    render(<BuildInfo />);
    const button = screen.getByRole('button', { name: /common:buildInfo\.label/i });
    expect(button).toBeInTheDocument();
  });

  it('should show the build time popover when clicked', () => {
    const formattedTime = 'January 11, 2026 at 2:30 PM';
    mockGetFormattedBuildTime.mockReturnValue(formattedTime);

    render(<BuildInfo />);
    
    // Initially, the popover content should not be visible
    expect(screen.queryByText(formattedTime)).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: /common:buildInfo\.label/i });
    fireEvent.click(button);

    // After click, the popover should be visible
    expect(screen.getByText(formattedTime)).toBeInTheDocument();
    expect(screen.getByText(/common:buildInfo\.prefix/i)).toBeInTheDocument();
  });

  it('should close the popover when clicked again', () => {
    const formattedTime = 'January 11, 2026 at 2:30 PM';
    mockGetFormattedBuildTime.mockReturnValue(formattedTime);

    render(<BuildInfo />);
    
    const button = screen.getByRole('button', { name: /common:buildInfo\.label/i });
    
    // Open
    fireEvent.click(button);
    expect(screen.getByText(formattedTime)).toBeInTheDocument();

    // Close
    fireEvent.click(button);
    expect(screen.queryByText(formattedTime)).not.toBeInTheDocument();
  });

  it('should use the correct locale for formatting', () => {
    const formattedTimeHU = '2026. jan. 11. 14:30';
    mockGetFormattedBuildTime.mockReturnValue(formattedTimeHU);

    render(<BuildInfo />);
    
    const button = screen.getByRole('button', { name: /common:buildInfo\.label/i });
    fireEvent.click(button);

    expect(mockGetFormattedBuildTime).toHaveBeenCalledWith('en-US');
  });
});
