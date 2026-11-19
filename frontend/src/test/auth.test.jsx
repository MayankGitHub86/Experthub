import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthModal from '../components/auth/AuthModal.jsx';
import authAPI from '../api/auth.js';

vi.mock('../api/auth.js', () => ({
  default: { login: vi.fn(), register: vi.fn() },
}));

describe('authentication modal', () => {
  beforeEach(() => localStorage.clear());

  it('uses the authenticated API result and stores its access token', async () => {
    const user = userEvent.setup();
    const onAuthenticate = vi.fn();
    authAPI.login.mockResolvedValue({
      accessToken: 'isolated-test-token',
      user: { email: 'client@example.test', firstName: 'Test', role: 'client' },
    });
    render(<AuthModal isOpen onClose={vi.fn()} onAuthenticate={onAuthenticate} />);
    await user.type(screen.getByLabelText(/email address/i), 'client@example.test');
    await user.type(screen.getByLabelText(/password/i), 'strong-test-password');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(await screen.findByText(/by continuing, you agree/i)).toBeInTheDocument();
    expect(authAPI.login).toHaveBeenCalledWith('client@example.test', 'strong-test-password');
    expect(localStorage.getItem('accessToken')).toBe('isolated-test-token');
    expect(onAuthenticate).toHaveBeenCalledWith(expect.objectContaining({ role: 'client', email: 'client@example.test' }));
  });
});
