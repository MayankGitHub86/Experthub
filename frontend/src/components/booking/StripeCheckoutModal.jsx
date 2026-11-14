import React, { useState } from 'react';
import { X, Lock, CheckCircle2, CreditCard, Shield, ArrowRight, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function StripeCheckoutModal({ bookingDetails, onClose, onBookingSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('08/28');
  const [cvc, setCvc] = useState('884');
  const [zip, setZip] = useState('94103');

  if (!bookingDetails) return null;

  const totalAmount = bookingDetails.package?.price || 280;
  const platformFee = Math.round(totalAmount * 0.15);
  const expertPayout = totalAmount - platformFee;

  const handlePay = (e) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // Fallback if canvas is not present
      }
    }, 1200);
  };

  const handleFinish = () => {
    onBookingSuccess({
      id: `#BK-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: bookingDetails.clientName,
      clientEmail: bookingDetails.clientEmail,
      expertName: bookingDetails.expert.name,
      serviceTitle: bookingDetails.package.title,
      date: bookingDetails.slot,
      amount: totalAmount,
      status: 'Confirmed'
    });
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
                  Stripe Connect Escrow Checkout
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Encrypted 256-bit multi-vendor payout
                </div>
              </div>
            </div>

            {/* Order Summary Pill */}
            <div style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{bookingDetails.package?.title}</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>${totalAmount}.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Scheduled slot: {bookingDetails.slot}</span>
                <span>Expert: {bookingDetails.expert?.name}</span>
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
                <span>Platform Commission (15%): ${platformFee}.00</span>
                <span>Direct Expert Payout: ${expertPayout}.00</span>
              </div>
            </div>

            {/* Simulated Stripe Credit Card Inputs */}
            <form onSubmit={handlePay}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Card Number
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--surface-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}>
                  <CreditCard size={16} color="var(--accent-purple-light)" />
                  <input 
                    type="text" 
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '13px', width: '100%' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '600' }}>VALID</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Expires
                  </label>
                  <input 
                    type="text" 
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--surface-input)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    CVC
                  </label>
                  <input 
                    type="text" 
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--surface-input)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Postal Code
                  </label>
                  <input 
                    type="text" 
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--surface-input)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isProcessing}
                className="btn-pro" 
                style={{ width: '100%', padding: '12px', fontSize: '14px' }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Authorizing Stripe Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Pay ${totalAmount}.00 with Stripe</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Payment Confirmed State */
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
              Your payment has been settled into escrow. A calendar invite and direct video room link have been sent to <strong>{bookingDetails.clientEmail}</strong>.
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
                <span style={{ color: 'var(--text-muted)' }}>Advisor:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{bookingDetails.expert?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Scheduled Time:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{bookingDetails.slot}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Stripe Charge ID:</span>
                <span style={{ color: 'var(--accent-purple-light)', fontFamily: 'monospace' }}>ch_3N87xLa9</span>
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
