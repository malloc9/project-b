import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { DashboardPage } from '../DashboardPage'
import '@testing-library/jest-dom'

describe('DashboardPage Accessibility (Stable)', () => {
  const renderWithRouter = (ui: React.ReactElement) =>
    render(<BrowserRouter>{ui}</BrowserRouter>)

  test('renders overview navigation cards with targets', () => {
    renderWithRouter(<DashboardPage />)
    const plantsCard = screen.getByRole('link', { name: /navigate to plants tracked page/i })
    const projectsCard = screen.getByRole('link', { name: /navigate to active projects page/i })
    const tasksCard = screen.getByRole('link', { name: /navigate to pending tasks page/i })
    const calendarCard = screen.getByRole('link', { name: /navigate to this week page/i })
    expect(plantsCard).toBeInTheDocument()
    expect(projectsCard).toBeInTheDocument()
    expect(tasksCard).toBeInTheDocument()
    expect(calendarCard).toBeInTheDocument()
  })

  test('navigation links point to expected routes', () => {
    renderWithRouter(<DashboardPage />)
    const plantsCard = screen.getByRole('link', { name: /plants tracked/i })
    expect(plantsCard).toHaveAttribute('href', '/plants')
    const projectsCard = screen.getByRole('link', { name: /active projects/i })
    expect(projectsCard).toHaveAttribute('href', '/projects')
    const tasksCard = screen.getByRole('link', { name: /pending tasks/i })
    expect(tasksCard).toHaveAttribute('href', '/tasks')
    const calendarCard = screen.getByRole('link', { name: /this week/i })
    expect(calendarCard).toHaveAttribute('href', '/calendar')
  })

  test('displays key dashboard texts', () => {
    renderWithRouter(<DashboardPage />)
    expect(screen.getByText(/Overview/i)).toBeInTheDocument()
  })
})
