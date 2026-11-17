import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Clock,
  Lock,
  DollarSign,
} from 'lucide-react';
import expertsAPI from '../../api/experts.js';

/**
 * Expert Stripe Connect Onboarding Component
 * 
 * Guides experts through the Stripe Connect setup process:
 * 1. Create connected account (one-time)
 * 2. Redirect to Stripe onboarding (bank info, verification docs)
 * 3. Display status and completion progress
 * 4. Show payout details once enabled
 */
export default function ExpertStripeOnboarding() {
  const [step, setStep] = useState('check'); // check, create, onboarding, complete, error
  const [accountStatus, setAccountStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onboardingUrl, setOnboardingUrl] = useState(null);

  /**
   * Check current account status on mount
   */
  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const status = await expertsAPI.getAccountStatus();

      // Determine current step based on account status
      if (status.chargesEnabled && status.payoutsEnabled) {
        setStep('complete');
      } else if (status.stripeAccountId) {
        setStep('onboarding');
      } else {
        setStep('create');
      }

      setAccountStatus(status);
    } catch (err) {
      // 404 or no account found
      if (err.response?.status === 404) {
        setStep('create');
        setAccountStatus(null);
      } else {
        setError(err.response?.data?.message || 'Failed to load account status');
        setStep('error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await expertsAPI.createStripeAccount();
      setAccountStatus(result);
      setStep('onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create Stripe account');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOnboarding = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentUrl = window.location.href;
      const returnUrl = currentUrl.split('?')[0]; // Remove query params

      const result = await expertsAPI.createOnboardingLink(returnUrl);
      setOnboardingUrl(result.url);

      // Redirect to Stripe onboarding (opens in new tab to preserve session)
      window.open(result.url, '_blank');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate onboarding link');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !accountStatus) {
    return (
      <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#818cf8' }} />
        <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading account status...</p>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8',
          }}
        >
          <CreditCard size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 2px 0' }}>
            Payment Payout Setup
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Connect your bank account to receive payments
          </p>
        </div>
      </div>

      {/* Create Account Step */}
      {step === 'create' && (
        <div>
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertCircle size={18} style={{ color: '#818cf8', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 4px 0' }}>
                  Start your Stripe setup
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  We'll guide you through connecting your bank account securely. The process takes about 5 minutes.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
              What you'll need:
            </h4>
            <ul style={{
              fontSize: '12px',
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {[
                'Valid government-issued ID',
                'Bank account information (routing & account number)',
                'Business or personal tax ID (SSN)',
                'Address and phone number'
              ].map((item, idx) => (
                <li key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleCreateAccount}
            disabled={isLoading}
            className="btn-pro"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <CreditCard size={16} />
                <span>Create Stripe Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgb(239, 68, 68)',
                color: 'rgb(239, 68, 68)',
                fontSize: '12px',
              }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      {/* Onboarding Step */}
      {step === 'onboarding' && accountStatus && (
        <div>
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Clock size={18} style={{ color: '#818cf8', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 4px 0' }}>
                  Complete your Stripe onboarding
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Click the button below to complete your setup. You'll enter your bank details and verify your identity.
                </p>
              </div>
            </div>
          </div>

          {/* Requirements Status */}
          {accountStatus.requirements && accountStatus.requirements.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
                Required Information:
              </h4>
              <ul style={{
                fontSize: '12px',
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                {accountStatus.requirements.map((req, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <AlertCircle size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleStartOnboarding}
            disabled={isLoading}
            className="btn-pro"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Preparing...</span>
              </>
            ) : (
              <>
                <ExternalLink size={16} />
                <span>Go to Stripe Setup</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '12px',
            textAlign: 'center'
          }}>
            Your data is secure and encrypted. Stripe is PCI-DSS compliant.
          </p>

          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgb(239, 68, 68)',
                color: 'rgb(239, 68, 68)',
                fontSize: '12px',
              }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      {/* Completion Step */}
      {step === 'complete' && accountStatus && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid var(--accent-green)',
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h3
            style={{
              fontSize: '18px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}
          >
            All Set!
          </h3>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginBottom: '20px',
          }}>
            Your Stripe account is fully set up. You can now receive payments for consultations.
          </p>

          {/* Payout Summary */}
          <div
            style={{
              backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <DollarSign size={16} style={{ color: '#10b981' }} />
              <h4 style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>Payout Information</h4>
            </div>

            <div style={{
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Stripe Account ID:</span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}>
                  {accountStatus.stripeAccountId?.substring(0, 20)}...
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bank Account Linked:</span>
                <span style={{ color: accountStatus.payoutsEnabled ? '#10b981' : '#ef4444' }}>
                  {accountStatus.payoutsEnabled ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Charges Enabled:</span>
                <span style={{ color: accountStatus.chargesEnabled ? '#10b981' : '#ef4444' }}>
                  {accountStatus.chargesEnabled ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <Lock size={14} style={{ marginTop: '2px', flexShrink: 0, color: '#10b981' }} />
            <span>
              ExpertHub takes a 15% platform fee. You keep 85% of every booking payment.
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      {step === 'error' && (
        <div>
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgb(239, 68, 68)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertCircle size={18} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  margin: '0 0 4px 0',
                  color: '#ef4444'
                }}>
                  Something went wrong
                </p>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: 0
                }}>
                  {error}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setError(null);
              checkAccountStatus();
            }}
            className="btn-secondary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
