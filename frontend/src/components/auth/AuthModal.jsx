import React, { useState, useRef, useEffect } from 'react';
import {
  X, Mail, Lock, User, Eye, EyeOff, ArrowRight, Shield,
  Sparkles, Briefcase, UserCheck, Settings
} from 'lucide-react';
import authAPI from '../../api/auth.js';

export default function AuthModal({ isOpen, onClose, onAuthenticate, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('client');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setApiError('');
      setIsLoading(false);
    }
  }, [isOpen, mode]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (mode === 'signup' && !formData.name.trim()) errs.name = 'Name is required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 6) errs.password = 'Min 6 characters';
    if (mode === 'signup' && formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setApiError('');

    try {
      if (mode === 'login') {
        // Call real login API
        const result = await authAPI.login(formData.email, formData.password);
        
        // Store tokens
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('refreshToken', result.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.user));

        // Call parent callback
        onAuthenticate({
          name: result.user.firstName || result.user.email.split('@')[0],
          email: result.user.email,
          role: result.user.role,
          mode,
          user: result.user,
        });
      } else {
        // Call real register API
        const result = await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: selectedRole,
        });

        // Store tokens
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('refreshToken', result.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.user));

        // Call parent callback
        onAuthenticate({
          name: result.user.firstName || formData.name,
          email: result.user.email,
          role: result.user.role,
          mode,
          user: result.user,
        });
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      const message = error.response?.data?.message || error.message || 'An error occurred';
      setApiError(message);
      console.error('Auth error:', error);
    }
  };

  const handleSocialAuth = (provider) => {
    setIsLoading(true);
    setApiError('');
    // Social auth not yet implemented - keep as mock
    setTimeout(() => {
      onAuthenticate({
        name: provider === 'google' ? 'Alex Morgan' : 'dev_user',
        email: provider === 'google' ? 'alex@example.com' : 'dev@github.io',
        role: selectedRole,
        mode: 'login',
        provider
      });
      setIsLoading(false);
    }, 1000);
  };

  const roles = [
    { id: 'client', label: 'Client', desc: 'Book consultations', icon: User },
    { id: 'expert', label: 'Expert', desc: 'Offer services', icon: Briefcase },
  ];

  return (
    <div className="auth-overlay">
      <div className="auth-modal" ref={modalRef}>
        {/* Close Button */}
        <button className="auth-close" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Left Panel - Branding */}
        <div className="auth-branding">
          <div className="auth-brand-glow" />
          <div className="auth-brand-content">
            <div className="landing-brand" style={{ marginBottom: '32px' }}>
              <div className="landing-brand-icon" style={{ width: '44px', height: '44px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 4v16l8-10 8 10V4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="landing-brand-text" style={{ fontSize: '24px' }}>ExpertHub</span>
            </div>

            <h2 className="auth-brand-title">
              {mode === 'login' ? 'Welcome back' : 'Join the future of consulting'}
            </h2>
            <p className="auth-brand-desc">
              {mode === 'login'
                ? 'Sign in to access your dashboard, manage bookings, and connect with experts.'
                : 'Create your account and start booking world-class experts in minutes.'}
            </p>

            <div className="auth-brand-stats">
              <div className="auth-stat">
                <Shield size={18} color="#10b981" />
                <span>Enterprise Security</span>
              </div>
              <div className="auth-stat">
                <Sparkles size={18} color="#8b5cf6" />
                <span>AI-Powered Matching</span>
              </div>
              <div className="auth-stat">
                <UserCheck size={18} color="#3b82f6" />
                <span>2,400+ Verified Experts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
            <p>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                className="auth-switch-btn"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Social Logins */}
          <div className="auth-social-row">
            <button className="auth-social-btn" onClick={() => handleSocialAuth('google')}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google
            </button>
            <button className="auth-social-btn" onClick={() => handleSocialAuth('github')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              GitHub
            </button>
          </div>

          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          {/* Role Selection (Sign Up Only) */}
          {mode === 'signup' && (
            <div className="auth-role-selector">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    className={`auth-role-btn ${selectedRole === role.id ? 'active' : ''}`}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <Icon size={16} />
                    <div>
                      <div className="auth-role-label">{role.label}</div>
                      <div className="auth-role-desc">{role.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* API Error Display */}
          {apiError && (
            <div className="auth-error-banner">
              {apiError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="auth-field">
                <label htmlFor="auth-name">Full Name</label>
                <div className={`auth-input-wrap ${errors.name ? 'error' : ''}`}>
                  <User size={16} />
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                {errors.name && <span className="auth-error">{errors.name}</span>}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">Email Address</label>
              <div className={`auth-input-wrap ${errors.email ? 'error' : ''}`}>
                <Mail size={16} />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {errors.email && <span className="auth-error">{errors.email}</span>}
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <div className={`auth-input-wrap ${errors.password ? 'error' : ''}`}>
                <Lock size={16} />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="auth-error">{errors.password}</span>}
            </div>

            {mode === 'signup' && (
              <div className="auth-field">
                <label htmlFor="auth-confirm-password">Confirm Password</label>
                <div className={`auth-input-wrap ${errors.confirmPassword ? 'error' : ''}`}>
                  <Lock size={16} />
                  <input
                    id="auth-confirm-password"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
                {errors.confirmPassword && <span className="auth-error">{errors.confirmPassword}</span>}
              </div>
            )}

            {mode === 'login' && (
              <div className="auth-forgot-row">
                <label className="auth-remember">
                  <input id="auth-remember" name="rememberMe" type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                <button type="button" className="auth-forgot-btn">Forgot password?</button>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <div className="auth-spinner" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="auth-terms">
            By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
