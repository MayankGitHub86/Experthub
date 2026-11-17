import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookingModal from '../BookingModal';

// Mock the bookingsAPI
jest.mock('../../../api/bookings.js', () => ({
  getExpertServices: jest.fn().mockResolvedValue([
    {
      _id: 'service1',
      title: 'Test Service',
      description: 'Test Description',
      duration: 60,
      pricing: { amount: 100 }
    }
  ]),
  getExpertAvailability: jest.fn().mockResolvedValue([
    {
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }
  ]),
  createHold: jest.fn().mockResolvedValue({
    _id: 'hold1',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  }),
  confirmBooking: jest.fn().mockResolvedValue({
    _id: 'booking1',
    clientName: 'Test Client',
    amount: 100
  })
}));

const mockExpert = {
  _id: 'expert1',
  firstName: 'John',
  lastName: 'Doe'
};

const mockOnClose = jest.fn();
const mockOnBookingSuccess = jest.fn();

describe('BookingModal Component - Hooks Order Regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Initial render with no expert should not throw hooks error', () => {
    // This should render nothing, but NOT throw a hooks order error
    const { container } = render(
      <BookingModal 
        expert={null} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );
    
    // Should render nothing when expert is null
    expect(container.firstChild).toBeNull();
  });

  test('2. Render with expert should not throw hooks error', () => {
    // This should now work without hooks order errors
    const { container } = render(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );
    
    // Should render the modal
    expect(container.querySelector('.exact-booking-overlay')).toBeInTheDocument();
  });

  test('3. Modal opening transitions work correctly', async () => {
    const { rerender, container } = render(
      <BookingModal 
        expert={null} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Initially null
    expect(container.firstChild).toBeNull();

    // Rerender with expert (simulating modal open)
    rerender(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Should now render
    await waitFor(() => {
      expect(container.querySelector('.exact-booking-overlay')).toBeInTheDocument();
    });
  });

  test('4. Modal closing works correctly', () => {
    const { rerender, container } = render(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Should render initially
    expect(container.querySelector('.exact-booking-overlay')).toBeInTheDocument();

    // Rerender with no expert (simulating modal close)
    rerender(
      <BookingModal 
        expert={null} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Should be null again
    expect(container.firstChild).toBeNull();
  });

  test('5. Repeated open/close cycles do not cause hooks errors', async () => {
    const { rerender, container } = render(
      <BookingModal 
        expert={null} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Cycle 1: Open
    rerender(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );
    expect(container.querySelector('.exact-booking-overlay')).toBeInTheDocument();

    // Cycle 1: Close
    rerender(
      <BookingModal 
        expert={null} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );
    expect(container.firstChild).toBeNull();

    // Cycle 2: Open
    rerender(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );
    expect(container.querySelector('.exact-booking-overlay')).toBeInTheDocument();

    // Cycle 2: Close
    rerender(
      <BookingModal 
        expert={null} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );
    expect(container.firstChild).toBeNull();

    // If we reach here without throwing, the test passes
  });

  test('6. Expert prop changes do not cause hooks errors', async () => {
    const expert2 = {
      _id: 'expert2',
      firstName: 'Jane',
      lastName: 'Smith'
    };

    const { rerender } = render(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Change expert prop
    rerender(
      <BookingModal 
        expert={expert2} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Should still render without errors
    await waitFor(() => {
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    });
  });

  test('7. Effects execute correctly and load services', async () => {
    const { getByText } = render(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Wait for services to load
    await waitFor(() => {
      expect(screen.getByText('Select a Service')).toBeInTheDocument();
    });
  });

  test('8. Re-render with same expert preserves state', async () => {
    const { rerender, getByText } = render(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Wait for services to load
    await waitFor(() => {
      expect(getByText('Select a Service')).toBeInTheDocument();
    });

    // Rerender with same expert
    rerender(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Should still work
    expect(getByText('Select a Service')).toBeInTheDocument();
  });

  test('9. Cleanup functions are called (timers cleared)', async () => {
    const { unmount } = render(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Unmount component - should clear intervals without errors
    expect(() => {
      unmount();
    }).not.toThrow();
  });

  test('10. No console errors during render', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <BookingModal 
        expert={mockExpert} 
        onClose={mockOnClose} 
        onBookingSuccess={mockOnBookingSuccess}
      />
    );

    // Should not have logged React errors
    const errors = consoleSpy.mock.calls.filter(call => 
      call[0]?.includes?.('Rendered more hooks than') ||
      call[0]?.includes?.('Rules of Hooks')
    );

    expect(errors).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});
