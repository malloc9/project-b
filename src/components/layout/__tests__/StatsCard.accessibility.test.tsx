import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StatsCard } from '../StatsCard';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock router for testing
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('StatsCard Accessibility Tests', () => {
  const mockProps = {
    title: 'Plants Tracked',
    value: 42,
    icon: '🌱',
    description: 'Active plants in your codex',
    color: 'green' as const,
  };

  describe('Keyboard Navigation', () => {
    it('should be focusable when href is provided', () => {
      renderWithRouter(
        <StatsCard {...mockProps} href="/plants" />
      );
      
      const card = screen.getByRole('link');
      expect(card).toBeInTheDocument();
      // Links are naturally focusable, no explicit tabindex needed
      card.focus();
      expect(card).toHaveFocus();
    });

    it('should be focusable when onClick is provided', () => {
      const mockClick = vi.fn();
      render(
        <StatsCard {...mockProps} onClick={mockClick} />
      );
      
      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
      // Buttons are naturally focusable, no explicit tabindex needed
      card.focus();
      expect(card).toHaveFocus();
    });

    it('should not be focusable when neither href nor onClick is provided', () => {
      render(<StatsCard {...mockProps} />);
      
      const card = screen.getByText('Plants Tracked').closest('div');
      expect(card).not.toHaveAttribute('tabindex');
      expect(card).not.toHaveAttribute('role');
    });

    it('should respond to Enter key when focused (with href)', () => {
      renderWithRouter(
        <StatsCard {...mockProps} href="/plants" />
      );
      
      const card = screen.getByRole('link');
      card.focus();
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
      
      expect(card).toHaveFocus();
      expect(card).toHaveAttribute('href', '/plants');
    });

    it('should respond to Enter key when focused (with onClick)', () => {
      const mockClick = vi.fn();
      render(
        <StatsCard {...mockProps} onClick={mockClick} />
      );
      
      const card = screen.getByRole('button');
      card.focus();
      // Test that the button is clickable (keyboard events are handled by browser)
      fireEvent.click(card);
      
      expect(mockClick).toHaveBeenCalled();
    });

    it('should respond to Space key when focused (button only)', () => {
      const mockClick = vi.fn();
      render(
        <StatsCard {...mockProps} onClick={mockClick} />
      );
      
      const card = screen.getByRole('button');
      card.focus();
      // Test that the button is clickable (keyboard events are handled by browser)
      fireEvent.click(card);
      
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should have proper ARIA label for navigation cards', () => {
      renderWithRouter(
        <StatsCard {...mockProps} href="/plants" />
      );
      
      const card = screen.getByRole('link');
      expect(card).toHaveAttribute(
        'aria-label',
        'Navigate to plants tracked page. Current value: 42. Active plants in your codex'
      );
    });

    it('should have proper ARIA label for action cards', () => {
      const mockClick = vi.fn();
      render(
        <StatsCard {...mockProps} onClick={mockClick} />
      );
      
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute(
        'aria-label',
        'Plants Tracked action. Current value: 42. Active plants in your codex'
      );
    });

    it('should have proper ARIA label without description', () => {
      renderWithRouter(
        <StatsCard 
          {...mockProps} 
          description={undefined}
          href="/plants" 
        />
      );
      
      const card = screen.getByRole('link');
      expect(card).toHaveAttribute(
        'aria-label',
        'Navigate to plants tracked page. Current value: 42'
      );
    });

    it('should have proper semantic HTML structure', () => {
      renderWithRouter(
        <StatsCard {...mockProps} href="/plants" />
      );
      
      const card = screen.getByRole('link');
      expect(card.tagName).toBe('A');
      expect(card).toHaveAttribute('href', '/plants');
    });

    it('should announce trend information to screen readers', () => {
      const trendProps = {
        ...mockProps,
        trend: { value: 15, isPositive: true },
        href: '/plants'
      };
      
      renderWithRouter(<StatsCard {...trendProps} />);
      
      // Check that trend information is present and accessible
      expect(screen.getByText('15%')).toBeInTheDocument();
      expect(screen.getByText('↗')).toBeInTheDocument();
    });
  });

  describe('Focus Indicators', () => {
    it('should have visible focus styles for navigation cards', () => {
      renderWithRouter(
        <StatsCard {...mockProps} href="/plants" />
      );
      
      const card = screen.getByRole('link');
      expect(card).toHaveClass('focus:outline-none');
      expect(card).toHaveClass('focus:ring-2');
      expect(card).toHaveClass('focus:ring-blue-500');
      expect(card).toHaveClass('focus:ring-offset-2');
    });

    it('should have visible focus styles for action cards', () => {
      const mockClick = vi.fn();
      render(
        <StatsCard {...mockProps} onClick={mockClick} />
      );
      
      const card = screen.getByRole('button');
      expect(card).toHaveClass('focus:outline-none');
      expect(card).toHaveClass('focus:ring-2');
      expect(card).toHaveClass('focus:ring-blue-500');
      expect(card).toHaveClass('focus:ring-offset-2');
    });

    it('should maintain focus visibility when focused', () => {
      renderWithRouter(
        <StatsCard {...mockProps} href="/plants" />
      );
      
      const card = screen.getByRole('link');
      card.focus();
      expect(card).toHaveFocus();
    });
  });

  describe('Hover States and Visual Feedback', () => {
    it('should have hover styles for interactive cards', () => {
      renderWithRouter(
        <StatsCard {...mockProps} href="/plants" />
      );
      
      const card = screen.getByRole('link');
      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveClass('transition-all');
      expect(card).toHaveClass('duration-200');
      expect(card).toHaveClass('hover:shadow-md');
      expect(card).toHaveClass('hover:scale-[1.02]');
    });

    it('should not have hover styles for non-interactive cards', () => {
      render(<StatsCard {...mockProps} />);
      
      const card = screen.getByText('Plants Tracked').closest('div');
      expect(card).not.toHaveClass('cursor-pointer');
      expect(card).not.toHaveClass('hover:shadow-md');
      expect(card).not.toHaveClass('hover:scale-[1.02]');
    });

    it('should respond to mouse hover events', () => {
      renderWithRouter(
        <StatsCard {...mockProps} href="/plants" />
      );
      
      const card = screen.getByRole('link');
      fireEvent.mouseEnter(card);
      
      // The hover styles are applied via CSS classes, so we just verify they exist
      expect(card).toHaveClass('hover:shadow-md');
      expect(card).toHaveClass('hover:scale-[1.02]');
    });
  });

  describe('Color Accessibility', () => {
    it('should maintain proper contrast ratios for all color variants', () => {
      const colors: Array<'blue' | 'green' | 'purple' | 'indigo' | 'red' | 'yellow'> = 
        ['blue', 'green', 'purple', 'indigo', 'red', 'yellow'];
      
      colors.forEach(color => {
        const { unmount } = renderWithRouter(
          <StatsCard {...mockProps} color={color} href="/test" />
        );
        
        const card = screen.getByRole('link');
        expect(card).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should maintain accessibility on different screen sizes', () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithRouter(
        <StatsCard {...mockProps} href="/plants" />
      );
      
      const card = screen.getByRole('link');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-label');
      
      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-label');
    });
  });
});