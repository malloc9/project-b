import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { VirtualList } from '../VirtualList';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';

interface TestItem {
  id: string;
  name: string;
}

const mockItems: TestItem[] = Array.from({ length: 100 }, (_, i) => ({
  id: `item-${i}`,
  name: `Item ${i}`,
}));

const renderItem = (item: TestItem, index: number) => (
  <div data-testid={`item-${index}`}>
    {item.name}
  </div>
);

describe('VirtualList', () => {
  it('renders visible items only', () => {
    render(
      <VirtualList
        items={mockItems}
        itemHeight={50}
        containerHeight={200}
        renderItem={renderItem}
      />
    );

    // Should render approximately 4 visible items + overscan (5 by default)
    // So around 14 items should be rendered
    const renderedItems = screen.getAllByTestId(/item-\d+/);
    expect(renderedItems.length).toBeLessThan(mockItems.length);
    expect(renderedItems.length).toBeGreaterThan(0);
  });

  it('updates visible items on scroll', () => {
    render(
      <VirtualList
        items={mockItems}
        itemHeight={50}
        containerHeight={200}
        renderItem={renderItem}
      />
    );

    const container = screen.getByTestId('virtual-list-container');
    
    // Scroll down
    fireEvent.scroll(container, { target: { scrollTop: 250 } });

    // Should render different items after scroll
    const renderedItems = screen.getAllByTestId(/item-\d+/);
    expect(renderedItems.length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    render(
      <VirtualList
        items={mockItems}
        itemHeight={50}
        containerHeight={200}
        renderItem={renderItem}
        className="custom-virtual-list"
      />
    );

    const container = screen.getByTestId('virtual-list-container');
    expect(container).toHaveClass('custom-virtual-list');
  });

  it('handles empty items array', () => {
    render(
      <VirtualList
        items={[]}
        itemHeight={50}
        containerHeight={200}
        renderItem={renderItem}
      />
    );

    const renderedItems = screen.queryAllByTestId(/item-\d+/);
    expect(renderedItems).toHaveLength(0);
  });

  it('calculates correct total height', () => {
    render(
      <VirtualList
        items={mockItems}
        itemHeight={50}
        containerHeight={200}
        renderItem={renderItem}
      />
    );

    const innerContainer = screen.getByTestId('virtual-list-inner');
    expect(innerContainer).toHaveStyle({ height: '5000px' }); // 100 items * 50px
  });

  it('uses custom overscan value', () => {
    render(
      <VirtualList
        items={mockItems}
        itemHeight={50}
        containerHeight={200}
        renderItem={renderItem}
        overscan={10}
      />
    );

    // With overscan of 10, should render more items
    const renderedItems = screen.getAllByTestId(/item-\d+/);
    expect(renderedItems.length).toBeGreaterThan(14); // More than default overscan
  });

  it('handles single item correctly', () => {
    const singleItem = [{ id: 'single', name: 'Single Item' }];
    
    render(
      <VirtualList
        items={singleItem}
        itemHeight={50}
        containerHeight={200}
        renderItem={renderItem}
      />
    );

    expect(screen.getByText('Single Item')).toBeInTheDocument();
  });
});