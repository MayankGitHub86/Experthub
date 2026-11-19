import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import authAPI from '../api/auth.js';

vi.mock('../api/auth.js', () => ({
  default: {
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../api/payments.js', () => ({ default: { listPayments: vi.fn() } }));

describe('App authentication shell', () => {
  beforeEach(() => {
    localStorage.clear();
    authAPI.refreshToken.mockRejectedValue(new Error('No active session'));
  });

  it('renders the public landing page after session hydration', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /find the right expert/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    expect(authAPI.refreshToken).not.toHaveBeenCalled();
  });

  it('opens the sign-in form from the landing page', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /find the right expert/i });
    await user.click(screen.getByRole('button', { name: /^login$/i }));
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });
});
