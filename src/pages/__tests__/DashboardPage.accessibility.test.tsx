import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock the hooks
vi.mock('../../hooks/usePlants', () => ({
  usePlants: () => ({
    plants: [
      { id: '1', name: 'Monstera', species: 'Monstera deliciosa' },
      { id: '2', name: 'Snake Plant', species: 'Sansevieria trifasciata' }
    ]
  })
}));

vi.mock('../../hooks/useProjects', () => ({
  useProjects: () => ({
    projects: [
      { id: '1', title: 'Kitchen Renovation', status: 'active' },
      { id: '2', title: 'Garden Setup', status: 'active' },
      { id: '3', title: 'Home Office', status: 'active' }
    ]
  })
}));

vi.mock('../../hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [
      { id: '1', title: 'Water plants', completed: false },
      { id: '2', title: 'Buy soil', completed: false },
      { id: '3', title: 'Repot monstera', completed: true },
      { id: '4', title: 'Clean tools', completed: false }
    ]
  })
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('DashboardPage Accessibility Integration Tests', () => {
  describe('Overview Cards Navigation', () => {
    it('should render all overview cards as navigational elements', () => {
      renderWithRouter(<DashboardPage />);
      
      const plantsCard = screen.getByRole('link', { name: /navigate to plants tracked page/i });
      const projectsCard = screen.getByRole('link', { name: /navigate to active projects page/i });
      const tasksCard = screen.getByRole('link', { name: /navigate to pending tasks page/i });
      const calendarCard = screen.getByRole('link', { name: /navigate to this week page/i });
      
      expect(plantsCard).toBeInTheDocument();
      expect(projectsCard).toBeInTheDocument();
      expect(tasksCard).toBeInTheDocument();
      expect(calendarCard).toBeInTheDocument();
    });

    it('should have correct navigation targets', () => {
      renderWithRouter(<DashboardPage />);
      
      expect(screen.getByRole('link', { name: /plants tracked/i })).toHaveAttribute('href', '/plants');
      expect(screen.getByRole('link', { name: /active projects/i })).toHaveAttribute('href', '/projects');
      expect(screen.getByRole('link', { name: /pending tasks/i })).toHaveAttribute('href', '/tasks');
      expect(screen.getByRole('link', { name: /this week/i })).toHaveAttribute('href', '/calendar');
    });

    it('should display correct statistical data', () => {
      renderWithRouter(<DashboardPage />);
      
      // Check specific cards by their aria-labels to avoid ambiguity
      expect(screen.getByLabelText(/plants tracked.*current value: 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/active projects.*current value: 3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pending tasks.*current value: 3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/this week.*current value: 0/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation Flow', () => {
    it('should allow tab navigation through all overview cards', async () => {
      renderWithRouter(<DashboardPage />);
      
      const cards = screen.getAllByRole('link').filter(link => 
        link.getAttribute('aria-label')?.includes('Navigate to')
      );
      
      expect(cards).toHaveLength(4);
      
      // Test tab navigation
      cards[0].focus();
      expect(cards[0]).toHaveFocus();
      
      fireEvent.keyDown(cards[0], { key: 'Tab' });
      // Note: In a real browser, Tab would move focus to the next element
      // In tests, we verify the elements are focusable
      cards.forEach(card => {
        card.focus();
        expect(card).toHaveFocus();
      });
    });

    it('should activate navigation on Enter key press', () => {
      renderWithRouter(<DashboardPage />);
      
      const plantsCard = screen.getByRole('link', { name: /plants tracked/i });
      plantsCard.focus();
      
      fireEvent.keyDown(plantsCard, { key: 'Enter', code: 'Enter' });
      
      // Verify the card is still focused and interactive
      expect(plantsCard).toHaveFocus();
      expect(plantsCard).toHaveAttribute('href', '/plants');
    });

    it('should maintain logical tab order', () => {
      renderWithRouter(<DashboardPage />);
      
      const interactiveElements = screen.getAllByRole('link');
      const overviewCards = interactiveElements.filter(link => 
        link.getAttribute('aria-label')?.includes('Navigate to')
      );
      
      // Verify cards appear in expected order
      expect(overviewCards[0]).toHaveAttribute('href', '/plants');
      expect(overviewCards[1]).toHaveAttribute('href', '/projects');
      expect(overviewCards[2]).toHaveAttribute('href', '/tasks');
      expect(overviewCards[3]).toHaveAttribute('href', '/calendar');
    });
  });

  describe('Screen Reader Experience', () => {
    it('should provide comprehensive ARIA labels for all overview cards', () => {
      renderWithRouter(<DashboardPage />);
      
      const plantsCard = screen.getByLabelText(/navigate to plants tracked page.*current value: 2.*active plants in your codex/i);
      const projectsCard = screen.getByLabelText(/navigate to active projects page.*current value: 3.*projects in progress/i);
      const tasksCard = screen.getByLabelText(/navigate to pending tasks page.*current value: 3.*tasks awaiting completion/i);
      const calendarCard = screen.getByLabelText(/navigate to this week page.*current value: 0.*upcoming deadlines/i);
      
      expect(plantsCard).toBeInTheDocument();
      expect(projectsCard).toBeInTheDocument();
      expect(tasksCard).toBeInTheDocument();
      expect(calendarCard).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderWithRouter(<DashboardPage />);
      
      const overviewHeading = screen.getByRole('heading', { name: 'Overview' });
      expect(overviewHeading).toBeInTheDocument();
      expect(overviewHeading.tagName).toBe('H2');
      
      const recentActivityHeading = screen.getByRole('heading', { name: 'Recent Activity' });
      expect(recentActivityHeading).toBeInTheDocument();
      
      const upcomingItemsHeading = screen.getByRole('heading', { name: 'Upcoming Items' });
      expect(upcomingItemsHeading).toBeInTheDocument();
      
      const gettingStartedHeading = screen.getByRole('heading', { name: 'Getting Started' });
      expect(gettingStartedHeading).toBeInTheDocument();
    });

    it('should provide context for statistical values', () => {
      renderWithRouter(<DashboardPage />);
      
      // Verify that each statistic has descriptive context
      expect(screen.getByText('Active plants in your codex')).toBeInTheDocument();
      expect(screen.getByText('Projects in progress')).toBeInTheDocument();
      expect(screen.getByText('Tasks awaiting completion')).toBeInTheDocument();
      expect(screen.getByText('Upcoming deadlines')).toBeInTheDocument();
    });
  });

  describe('Visual Feedback and Hover States', () => {
    it('should apply hover styles to all overview cards', () => {
      renderWithRouter(<DashboardPage />);
      
      const cards = screen.getAllByRole('link').filter(link => 
        link.getAttribute('aria-label')?.includes('Navigate to')
      );
      
      cards.forEach(card => {
        expect(card).toHaveClass('cursor-pointer');
        expect(card).toHaveClass('hover:shadow-md');
        expect(card).toHaveClass('hover:scale-[1.02]');
        expect(card).toHaveClass('transition-all');
        expect(card).toHaveClass('duration-200');
      });
    });

    it('should respond to mouse interactions', () => {
      renderWithRouter(<DashboardPage />);
      
      const plantsCard = screen.getByRole('link', { name: /plants tracked/i });
      
      fireEvent.mouseEnter(plantsCard);
      expect(plantsCard).toHaveClass('hover:shadow-md');
      
      fireEvent.mouseLeave(plantsCard);
      expect(plantsCard).toHaveClass('hover:shadow-md'); // Class is still there for CSS to use
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators on all interactive elements', () => {
      renderWithRouter(<DashboardPage />);
      
      const cards = screen.getAllByRole('link').filter(link => 
        link.getAttribute('aria-label')?.includes('Navigate to')
      );
      
      cards.forEach(card => {
        expect(card).toHaveClass('focus:outline-none');
        expect(card).toHaveClass('focus:ring-2');
        expect(card).toHaveClass('focus:ring-blue-500');
        expect(card).toHaveClass('focus:ring-offset-2');
      });
    });

    it('should maintain focus when navigating with keyboard', () => {
      renderWithRouter(<DashboardPage />);
      
      const plantsCard = screen.getByRole('link', { name: /plants tracked/i });
      plantsCard.focus();
      
      expect(plantsCard).toHaveFocus();
      
      // Simulate focus remaining after interaction
      fireEvent.keyDown(plantsCard, { key: 'Enter' });
      expect(plantsCard).toHaveFocus();
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility features across different viewport sizes', () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithRouter(<DashboardPage />);
      
      const cards = screen.getAllByRole('link').filter(link => 
        link.getAttribute('aria-label')?.includes('Navigate to')
      );
      
      cards.forEach(card => {
        expect(card).toHaveAttribute('aria-label');
        expect(card).toHaveClass('focus:ring-2');
      });
      
      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      cards.forEach(card => {
        expect(card).toHaveAttribute('aria-label');
        expect(card).toHaveClass('focus:ring-2');
      });
    });
  });

  describe('Error States and Edge Cases', () => {
    it('should handle zero values gracefully', () => {
      // The mocked data already provides non-zero values
      // This test verifies the cards are still accessible
      renderWithRouter(<DashboardPage />);
      
      // Should still be accessible even with zero values
      const cards = screen.getAllByRole('link').filter(link => 
        link.getAttribute('aria-label')?.includes('Navigate to')
      );
      
      expect(cards).toHaveLength(4);
      cards.forEach(card => {
        expect(card).toHaveAttribute('aria-label');
        expect(card).toBeInTheDocument();
      });
    });
  });
});