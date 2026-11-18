import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { X, Lock, CheckCircle2, Shield, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import paymentsAPI from '../../api/payments.js';

// Initialize Stripe (use environment variable for publishable key)
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.error('❌ STRIPE CONFIGURATION ERROR: VITE_STRIPE_PUBLISHABLE_KEY is not set in .env');
  console.error('   Frontend will not be able to load Stripe');
}

// Create and cache the Stripe Promise
let stripePromise = null;
let stripeInitError = null;

function getStripePromise() {
  if (stripePromise) {
    return stripePromise;
  }
  
  if (!publishableKey) {
    stripeInitError = 'Stripe publishable key is not configured';
    console.error(stripeInitError);
    return Promise.reject(new Error(stripeInitError));
  }
  
  stripePromise = loadStripe(publishableKey).catch(err => {
    stripeInitError = `Failed to initialize Stripe: ${err.message}`;
    console.error(stripeInitError, err);
    throw err;
  });
  
  return stripePromise;
}

/**
 * Payment form component that handles the actual Stripe payment.
 * MUST be rendered inside <Elements> provider — Stripe hooks are always
 * called unconditionally at the top level, satisfying React's rules of hooks.
 */
function StripePaymentForm({ bookingDetails, onSuccess, onError, onProcessing }) {
  // These hooks MUST be called unconditionally at the top level
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    onProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking-confirmation`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        onError(error.message);
        setIsProcessing(false);
        onProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        onSuccess(paymentIntent);
        setIsProcessing(false);
        onProcessing(false);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Payment processing failed');
      onError(err.message);
      setIsProcessing(false);
      onProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {errorMessage && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgb(239, 68, 68)',
          color: 'rgb(239, 68, 68)',
          fontSize: '13px'
        }}>
          {errorMessage}
        </div>
      )}
      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="btn-pro"
        style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '16px' }}
      >
        {isProcessing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <Lock size={15} />
            <span>Pay ${(bookingDetails.totalAmount / 100).toFixed(2)} with Stripe</span>
          </>
        )}
      </button>
    </form>
  );
}

/**
 * Main Stripe checkout modal component.
 *
 * Rules of Hooks fix applied here:
 * - ALL useState / useEffect calls happen unconditionally at the top of the
 *   function body, before any conditional JSX is returned.
 * - <Elements> + <StripePaymentForm> are only mounted once BOTH clientSecret
 *   AND stripeInstance are available. They are never conditionally
 *   mounted/unmounted based on loading or error state — those states are
 *   shown as separate branches BEFORE the Elements subtree is considered.
 * - <StripePaymentForm> (which calls useStripe / useElements) is NEVER
 *   rendered outside <Elements>. The intermediate PaymentContent wrapper that
 *   previously caused the conditional-Elements anti-pattern has been removed.
 */
export default function StripeCheckoutModal({ bookingDetails, onClose, onBookingSuccess }) {
  // ── ALL HOOKS UNCONDITIONALLY AT THE TOP ─────────────────────────────────
  const [clientSecret, setClientSecret] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [_isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successDetails, setSuccessDetails] = useState(null);
  const [stripeInstance, setStripeInstance] = useState(null);
  // ─────────────────────────────────────────────────────────────────────────

  // Guard against null or invalid bookingDetails
  useEffect(() => {
    if (!bookingDetails || !bookingDetails.bookingId) {
      console.warn('⚠️ StripeCheckoutModal: Invalid or missing bookingDetails');
      setError('Invalid booking data. Please try again.');
      setIsLoading(false);
    }
  }, [bookingDetails]);

  /**
   * Initialize Stripe on component mount.
   * Only proceed if bookingDetails exists.
   */
  useEffect(() => {
    if (!bookingDetails) return;
    
    getStripePromise()
      .then(stripe => {
        console.log('✅ Stripe initialized for booking:', bookingDetails.bookingId);
        setStripeInstance(stripe);
      })
      .catch(err => {
        const errMsg = `Stripe initialization failed: ${err.message}`;
        console.error('❌', errMsg);
        setError(errMsg);
        setIsLoading(false);
      });
  }, [bookingDetails]);

  /**
   * Create PaymentIntent when stripeInstance becomes available.
   */
  useEffect(() => {
    if (!bookingDetails || !stripeInstance) {
      return;
    }

    console.log('💳 Creating PaymentIntent for booking:', bookingDetails.bookingId);

    const initializePayment = async () => {
      try {
        setIsLoading(true);
        const totalAmount = bookingDetails.totalAmount;
        const response = await paymentsAPI.createIntent(
          bookingDetails.bookingId,
          totalAmount,
          bookingDetails.currency || 'USD'
        );

        console.log('✅ PaymentIntent created:', response.id);
        setClientSecret(response.client_secret);
        setError(null);
      } catch (err) {
        const errMsg = err.response?.data?.message || 'Failed to initialize payment. Please try again.';
        console.error('❌ Payment initialization error:', err.response?.data || err.message);
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [bookingDetails, stripeInstance]);

  // ── ALL HOOKS HAVE BEEN CALLED — conditional returns are safe below ───────

  // Guard: no valid booking
  if (!bookingDetails || !bookingDetails.bookingId) {
    return null;
  }

  const totalAmount = bookingDetails.totalAmount; // Amount in cents
  const displayAmount = (totalAmount / 100).toFixed(2);
  const platformFee = Math.round(totalAmount * 0.15);
  const expertPayout = totalAmount - platformFee;

  // ── Event handlers ────────────────────────────────────────────────────────

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      const status = await paymentsAPI.getPaymentStatus(paymentIntent.id);
      
      if (status.status === 'paid' || paymentIntent.status === 'succeeded') {
        setIsSuccess(true);
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // Fallback if canvas-confetti fails — silently ignore
        }

        setSuccessDetails({
          id: paymentIntent.id,
          clientName: bookingDetails.clientName,
          clientEmail: bookingDetails.clientEmail,
          expertName: bookingDetails.expertName,
          serviceTitle: bookingDetails.serviceTitle,
          date: bookingDetails.scheduledAt,
          amount: displayAmount,
          status: 'Confirmed'
        });
      }
    } catch (err) {
      setError('Payment succeeded but confirmation failed. Please contact support.');
      console.error('Payment verification error:', err);
    }
  };

  const handleFinish = () => {
    if (successDetails) {
      onBookingSuccess(successDetails);
    }
  };

  const handleError = (errorMsg) => {
    setError(errorMsg);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  /**
   * Determine what to show in the payment area.
   *
   * Key invariant: <StripePaymentForm> (which calls useStripe / useElements)
   * is ONLY ever rendered as a child of <Elements>. We achieve this by
   * deciding here — in plain JS, before JSX — which branch to render, then
   * embedding it once in the JSX tree below.
   *
   * Branches (mutually exclusive, evaluated in priority order):
   *   1. Loading spinner  — waiting for clientSecret or stripeInstance
   *   2. Error banner     — something went wrong (no Elements needed)
   *   3. Payment form     — both ready; render <Elements><StripePaymentForm>
   */
  const renderPaymentArea = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#818cf8' }} />
          <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Initializing secure payment...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgb(239, 68, 68)',
          color: 'rgb(239, 68, 68)',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          <strong>❌ Error:</strong> {error}
        </div>
      );
    }

    if (!clientSecret || !stripeInstance) {
      // Still waiting — show a subtle "preparing" message (no Elements yet)
      return (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgb(59, 130, 246)',
          color: 'rgb(59, 130, 246)',
          fontSize: '13px'
        }}>
          Preparing payment form...
        </div>
      );
    }

    // Both clientSecret and stripeInstance are ready.
    // <StripePaymentForm> is ALWAYS inside <Elements> — the only place it appears.
    return (
      <Elements
        stripe={stripeInstance}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#818cf8',
              colorBackground: '#ffffff',
              colorText: '#1f2937',
              colorDanger: '#ef4444',
              fontFamily: '"Inter", "system-ui", "sans-serif"',
              fontSize: '14px',
              borderRadius: '8px'
            }
          }
        }}
      >
        <StripePaymentForm
          bookingDetails={bookingDetails}
          onSuccess={handlePaymentSuccess}
          onError={handleError}
          onProcessing={setIsProcessing}
        />
      </Elements>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isSuccess && (
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        )}

        {!isSuccess ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8'
              }}>
                <Lock size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Secure Payment Checkout
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Powered by Stripe Connect
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{bookingDetails.serviceTitle}</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>${displayAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span>Expert: {bookingDetails.expertName}</span>
                <span>Scheduled: {bookingDetails.scheduledAt}</span>
              </div>
              <div style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px dashed var(--border-subtle)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Platform Fee (15%): ${(platformFee / 100).toFixed(2)}</span>
                <span>Expert Payout (85%): ${(expertPayout / 100).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment area — single call site, no duplicate Elements mounts */}
            {renderPaymentArea()}

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Shield size={14} />
              <span>Your payment information is encrypted and secured by Stripe</span>
            </div>
          </div>
        ) : (
          /* Success State */
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid var(--accent-green)',
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Consultation Confirmed!
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', maxWidth: '380px', margin: '0 auto 18px auto' }}>
              Your payment has been processed and is now in escrow. A calendar invite and direct video room link have been sent to <strong>{bookingDetails.clientEmail}</strong>.
            </p>

            <div style={{
              backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '20px',
              textAlign: 'left',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Expert:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{bookingDetails.expertName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Scheduled Time:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{bookingDetails.scheduledAt}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment ID:</span>
                <span style={{ color: 'var(--accent-purple-light)', fontFamily: 'monospace', fontSize: '11px' }}>
                  {successDetails?.id?.substring(0, 20)}...
                </span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="btn-pro"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              <span>Go to Consultation Room</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
