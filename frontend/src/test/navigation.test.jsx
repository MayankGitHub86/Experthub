import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from '../components/common/Sidebar.jsx';
import TopHeader from '../components/common/TopHeader.jsx';

describe('workspace navigation', () => {
  it('routes the client to services when the Services item is selected', async () => {
    const user = userEvent.setup();
    const setActiveTab = vi.fn();
    render(<Sidebar activeTab="dashboard" setActiveTab={setActiveTab} theme="light" userRole="client" />);
    await user.click(screen.getByRole('button', { name: 'Services' }));
    expect(setActiveTab).toHaveBeenCalledWith('products');
  });

  it('updates the selected date range from the header menu', async () => {
    const user = userEvent.setup();
    const setDateRange = vi.fn();
    render(<TopHeader activeTab="dashboard" theme="dark" dateRange="Last 30 Days" setDateRange={setDateRange} notifications={[]} currentUser={{ firstName: 'Sam' }} />);
    await user.click(screen.getByRole('button', { name: /last 30 days/i }));
    await user.click(screen.getByRole('button', { name: /Last 7 Days \(/i }));
    expect(setDateRange).toHaveBeenCalledWith('Last 7 Days (Jun 3 - Jun 10)');
  });
});
