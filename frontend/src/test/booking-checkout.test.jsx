import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BookingModal from '../components/booking/BookingModal.jsx';
import StripeCheckoutModal from '../components/booking/StripeCheckoutModal.jsx';
import bookingsAPI from '../api/bookings.js';
import paymentsAPI from '../api/payments.js';

vi.mock('../api/bookings.js', () => ({
  default: {
    getExpertServices: vi.fn(),
    getExpertAvailability: vi.fn(),
    createHold: vi.fn(),
    confirmBooking: vi.fn(),
    getBookingById: vi.fn(),
  },
}));
vi.mock('../api/payments.js', () => ({ default: { createIntent: vi.fn() } }));
vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn().mockResolvedValue({}) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => children,
  PaymentElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

describe('booking and checkout states', () => {
  it('displays only an active, approved service returned by the API', async () => {
    bookingsAPI.getExpertServices.mockResolvedValue([
      { _id: '507f1f77bcf86cd799439012', title: 'Strategy session', description: 'One hour', duration: 60, pricing: { amount: 120, currency: 'USD' }, isActive: true, status: 'approved' },
      { _id: '507f1f77bcf86cd799439013', title: 'Unapproved draft', duration: 60, pricing: { amount: 10 }, isActive: true, status: 'pending' },
    ]);
    render(<BookingModal expert={{ _id: '507f1f77bcf86cd799439011', firstName: 'An', lastName: 'Expert' }} onClose={vi.fn()} onProceedToPayment={vi.fn()} />);
    expect(await screen.findByText('Strategy session')).toBeInTheDocument();
    expect(screen.queryByText('Unapproved draft')).not.toBeInTheDocument();
  });

  it('shows a real payment initialization failure without mounting a payment form', async () => {
    paymentsAPI.createIntent.mockRejectedValue({ response: { data: { message: 'Connected account cannot accept charges.' } } });
    render(<StripeCheckoutModal bookingDetails={{ bookingId: '507f1f77bcf86cd799439099', totalAmount: 12000, currency: 'USD' }} onClose={vi.fn()} onBookingSuccess={vi.fn()} />);
    expect(await screen.findByText('Connected account cannot accept charges.')).toBeInTheDocument();
    expect(paymentsAPI.createIntent).toHaveBeenCalledWith('507f1f77bcf86cd799439099', 12000, 'USD');
  });
});
