import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SalesView from '../components/sales/SalesView.jsx';
import CustomersView from '../components/customers/CustomersView.jsx';
import paymentsAPI from '../api/payments.js';
import usersAPI from '../api/users.js';

vi.mock('../api/payments.js', () => ({ default: { listPayments: vi.fn() } }));
vi.mock('../api/users.js', () => ({ default: { listUsers: vi.fn(), getUserDetails: vi.fn() } }));

describe('live admin views', () => {
  beforeEach(() => {
    paymentsAPI.listPayments.mockResolvedValue({
      payments: [{ id: 'pi_test_1', paymentIntentId: 'pi_test_1', bookingNumber: 'EH-1', clientName: 'A Client', expertName: 'An Expert', amount: 10000, expertPayout: 8180, platformFee: 1500, processingFee: 320, currency: 'USD', status: 'completed', createdAt: '2026-01-10T12:00:00.000Z' }],
      pagination: { pages: 1, total: 1 },
    });
    usersAPI.listUsers.mockResolvedValue({
      users: [{ id: '507f1f77bcf86cd799439011', firstName: 'Ava', lastName: 'Client', name: 'Ava Client', email: 'ava@example.test', role: 'client', status: 'active', totalBookings: 2, completedBookings: 1, cancelledBookings: 1, totalSpent: null, settledSpendByCurrency: [{ currency: 'USD', amount: 85 }, { currency: 'EUR', amount: 12 }] }],
      pagination: { pages: 1, total: 1 },
    });
  });

  it('renders stored payment amounts and opens a transaction detail', async () => {
    const user = userEvent.setup();
    render(<SalesView />);
    expect(await screen.findByText('A Client')).toBeInTheDocument();
    expect(screen.getAllByText('$100.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$15.00').length).toBeGreaterThan(0);
    expect(screen.getByText('$3.20')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /details/i }));
    expect(screen.getAllByText(/pi_test_1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('$81.80').length).toBeGreaterThan(0);
  });

  it('passes a selected date range to the payments API', async () => {
    const user = userEvent.setup();
    render(<SalesView />);
    await screen.findByText('A Client');
    await user.selectOptions(screen.getByRole('combobox', { name: /filter payments by date/i }), '7');
    await waitFor(() => {
      const params = paymentsAPI.listPayments.mock.calls.at(-1)[0];
      expect(params.startDate).toBeTruthy();
      expect(params.endDate).toBeTruthy();
      expect(new Date(params.endDate).getTime() - new Date(params.startDate).getTime()).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 1000);
    });
  });

  it('renders real customer rows and loads the selected customer history', async () => {
    const user = userEvent.setup();
    usersAPI.getUserDetails.mockResolvedValue({ user: { name: 'Ava Client' }, bookings: [] });
    render(<CustomersView />);
    expect(await screen.findByText('ava@example.test')).toBeInTheDocument();
    expect(screen.getByText('$85.00 · €12.00')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: /filter accounts by status/i }), 'suspended');
    await waitFor(() => expect(usersAPI.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'suspended' })));
    await user.click(screen.getByRole('button', { name: /profile/i }));
    await waitFor(() => expect(usersAPI.getUserDetails).toHaveBeenCalledWith('507f1f77bcf86cd799439011'));
    expect(await screen.findByText(/no recorded consultation bookings/i)).toBeInTheDocument();
  });
});
