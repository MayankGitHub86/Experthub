import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  FileText, 
  Tag, 
  Clock, 
  Info, 
  MessageSquare,
  CheckCircle,
  CreditCard,
  Calendar as CalendarIcon,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Loader
} from 'lucide-react';
import ExpertHubLogo from '../common/ExpertHubLogo';
import bookingsAPI from '../../api/bookings.js';

export default function BookingModal({ expert, initialPackage, onClose, onBookingSuccess, onProceedToPayment }) {
  const [step, setStep] = useState(1); // 1: Select Service, 2: Select Date/Time, 3: Confirm, 4: Success
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [clientNotes, setClientNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdHold, setCreatedHold] = useState(null);
  const [holdCountdown, setHoldCountdown] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const expertId = expert?._id || expert?.id;

  // Load expert's services on mount
  useEffect(() => {
    if (!expert) return;

    const loadServices = async () => {
      try {
        setLoading(true);
        setError(null);

        let loadedServices = [];

        if (expertId && String(expertId).match(/^[0-9a-fA-F]{24}$/)) {
          try {
            const data = await bookingsAPI.getExpertServices(expertId);
            if (Array.isArray(data) && data.length > 0) {
              loadedServices = data;
            }
          } catch (apiErr) {
            console.warn('Could not fetch services from API, checking fallback:', apiErr.message);
          }
        }

        // Fallback to embedded services or packages
        if (loadedServices.length === 0) {
          if (expert.services && Array.isArray(expert.services) && expert.services.length > 0) {
            loadedServices = expert.services.map(s => ({
              _id: s._id || s.id,
              title: s.title || s.name,
              description: s.description || s.desc || '',
              duration: typeof s.duration === 'number' ? s.duration : (parseInt(s.duration) || 60),
              pricing: {
                amount: s.pricing?.amount || s.price || 100,
                currency: s.pricing?.currency || 'USD'
              }
            }));
          } else if (expert.packages && Array.isArray(expert.packages) && expert.packages.length > 0) {
            loadedServices = expert.packages.map(p => ({
              _id: p._id || p.id,
              title: p.title || p.name,
              description: p.description || p.desc || '',
              duration: typeof p.duration === 'number' ? p.duration : (parseInt(p.duration) || 60),
              pricing: {
                amount: p.pricing?.amount || p.price || 100,
                currency: p.pricing?.currency || 'USD'
              }
            }));
          } else if (expert.hourlyRate) {
            loadedServices = [{
              _id: `standard-${expertId}`,
              title: '1-on-1 Consultation Session',
              description: `Standard 60-minute advisory consultation session with ${expert.name || expert.firstName || 'expert'}.`,
              duration: 60,
              pricing: {
                amount: expert.hourlyRate,
                currency: 'USD'
              }
            }];
          }
        }

        setServices(loadedServices);

        // Pre-select initialPackage if provided
        if (initialPackage) {
          const matched = loadedServices.find(s => 
            s._id === initialPackage.id || 
            s._id === initialPackage._id || 
            s.title === initialPackage.title ||
            s.title === initialPackage.name
          );
          if (matched) {
            setSelectedService(matched);
            setStep(2);
          } else if (initialPackage.title || initialPackage.name) {
            const synthetic = {
              _id: initialPackage.id || initialPackage._id || 'init-pkg',
              title: initialPackage.title || initialPackage.name,
              description: initialPackage.desc || initialPackage.description || '',
              duration: typeof initialPackage.duration === 'number' ? initialPackage.duration : (parseInt(initialPackage.duration) || 60),
              pricing: {
                amount: initialPackage.price || initialPackage.pricing?.amount || 100,
                currency: 'USD'
              }
            };
            setSelectedService(synthetic);
            setStep(2);
          }
        }
      } catch (err) {
        console.error('Error loading services:', err);
        setError('Failed to load services');
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, [expertId, initialPackage]);

  // Load availability when date or service changes
  useEffect(() => {
    if (!selectedService || !selectedDate || !expert) return;

    const loadAvailability = async () => {
      try {
        setLoading(true);
        setError(null);
        const startDate = selectedDate.toISOString();
        const endDate = new Date(selectedDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();

        let slots = [];
        if (expertId && String(expertId).match(/^[0-9a-fA-F]{24}$/) && 
            selectedService._id && String(selectedService._id).match(/^[0-9a-fA-F]{24}$/)) {
          try {
            const data = await bookingsAPI.getExpertAvailability(expertId, selectedService._id, startDate, endDate);
            if (Array.isArray(data) && data.length > 0) {
              slots = data;
            }
          } catch (slotErr) {
            console.warn('API availability lookup failed, using fallback slots:', slotErr.message);
          }
        }

        // If no slots returned from API, generate daytime slots for this date
        if (slots.length === 0) {
          const now = new Date();
          const baseDate = new Date(selectedDate);
          for (let h = 9; h <= 17; h += 2) {
            const slotStart = new Date(baseDate);
            slotStart.setHours(h, 0, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + (selectedService.duration || 60) * 60000);
            if (slotStart > now) {
              slots.push({
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString()
              });
            }
          }
        }

        setAvailableSlots(slots);
        setSelectedSlot(null);
      } catch (err) {
        console.error('Error loading availability:', err);
        setError('Failed to load availability');
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [selectedService, selectedDate, expertId]);

  // Handle hold countdown
  useEffect(() => {
    if (!createdHold) return;

    const expiresAt = new Date(createdHold.expiresAt);
    const interval = setInterval(() => {
      const now = new Date();
      const remaining = expiresAt - now;
      
      if (remaining <= 0) {
        setHoldCountdown('Expired');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setHoldCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdHold]);

  const handleCreateHold = async () => {
    if (!selectedService || !selectedSlot) {
      setError('Please select a service and time slot');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let hold;
      if (expertId && String(expertId).match(/^[0-9a-fA-F]{24}$/) &&
          selectedService._id && String(selectedService._id).match(/^[0-9a-fA-F]{24}$/)) {
        hold = await bookingsAPI.createHold(
          expertId,
          selectedService._id,
          selectedSlot.startTime,
          'UTC'
        );
      } else {
        // Mock hold for non-ObjectId test instances
        hold = {
          _id: `mock-hold-${Date.now()}`,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };
      }
      
      setCreatedHold(hold);
      setStep(3); // Move to confirmation
    } catch (err) {
      console.error('Error creating hold:', err);
      setError(err.response?.data?.message || 'Failed to create booking hold');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!createdHold) {
      setError('Hold not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let booking;
      if (createdHold._id && !createdHold._id.startsWith('mock-')) {
        booking = await bookingsAPI.confirmBooking(createdHold._id, clientNotes);
      } else {
        booking = {
          _id: `booking-${Date.now()}`,
          status: 'payment_pending',
          totalAmount: (selectedService.pricing?.amount || 100) * 1.15,
          scheduledAt: selectedSlot?.startTime || new Date().toISOString()
        };
      }
      
      setConfirmedBooking(booking);
      setStep(4); // Success step
      
      // Callback to parent
      if (onBookingSuccess) {
        onBookingSuccess(booking);
      }
    } catch (err) {
      console.error('Error confirming booking:', err);
      setError(err.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedPayment = () => {
    console.log('🔵 handleProceedPayment called');
    console.log('  onProceedToPayment callback exists:', !!onProceedToPayment);
    console.log('  confirmedBooking:', confirmedBooking);
    
    if (onProceedToPayment && confirmedBooking) {
      const paymentData = {
        bookingId: confirmedBooking._id,
        totalAmount: Math.round((confirmedBooking.totalAmount || (selectedService?.pricing?.amount || 100)) * 100),
        currency: selectedService?.pricing?.currency || 'USD',
        expertName: expert.name || `${expert.firstName || ''} ${expert.lastName || ''}`.trim() || 'Expert',
        scheduledAt: selectedSlot?.startTime ? new Date(selectedSlot.startTime).toLocaleString() : new Date().toLocaleString(),
        clientEmail: ''
      };
      console.log('  📤 Calling onProceedToPayment with:', paymentData);
      onProceedToPayment(paymentData);
    } else {
      console.warn('  ❌ Cannot proceed: missing callback or booking');
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedService) {
      setStep(2);
    } else if (step === 2 && selectedSlot) {
      handleCreateHold();
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  // Early return AFTER all hooks have been called - render nothing if no expert
  if (!expert) {
    return null;
  }

  return (
    <div className="exact-booking-overlay" onClick={onClose}>
      <div className="exact-booking-modal-window" onClick={(e) => e.stopPropagation()}>
        <button className="booking-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="exact-booking-header">
          <ExpertHubLogo size={34} />
          <div className="booking-help-contact">
            <span className="help-label">Expert: {expert.name || `${expert.firstName || ''} ${expert.lastName || ''}`.trim() || 'Expert'}</span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="exact-booking-stepper">
          <div className="stepper-track-line" />
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`stepper-step-item ${step >= s ? 'completed' : ''} ${step === s ? 'current' : ''}`}>
              <div className="stepper-circle">{s}</div>
              <span className="stepper-title">
                {s === 1 ? 'Service' : s === 2 ? 'Date & Time' : s === 3 ? 'Confirm' : 'Success'}
              </span>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="exact-booking-body-grid">
          {error && (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Service Selection */}
          {step === 1 && (
            <div className="booking-left-card">
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Select a Service</h3>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader size={20} className="spinner" />
                  <span>Loading services...</span>
                </div>
              ) : services.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No services available</p>
              ) : (
                services.map((service) => (
                  <div
                    key={service._id}
                    onClick={() => setSelectedService(service)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      border: selectedService?._id === service._id ? '2px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                      backgroundColor: selectedService?._id === service._id ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface-input)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{service.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {service.description?.substring(0, 60)}...
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600' }}>
                      <span>${service.pricing?.amount}</span>
                      <span>{service.duration} min</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* STEP 2: Date & Time Selection */}
          {step === 2 && selectedService && (
            <>
              <div className="booking-left-card">
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Select Date</h3>
                <div style={{ marginBottom: '12px', textAlign: 'center', fontWeight: '600' }}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} style={{ textAlign: 'center', fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {day}
                    </div>
                  ))}
                  {renderCalendar().map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (day) {
                          const newDate = new Date(selectedDate);
                          newDate.setDate(day);
                          setSelectedDate(newDate);
                        }
                      }}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: selectedDate.getDate() === day && selectedDate.getMonth() === new Date().getMonth() ? '2px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                        backgroundColor: selectedDate.getDate() === day && selectedDate.getMonth() === new Date().getMonth() ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                        cursor: day ? 'pointer' : 'default',
                        color: day ? 'var(--text-primary)' : 'var(--text-muted)',
                        opacity: day ? 1 : 0.3,
                        fontWeight: selectedDate.getDate() === day ? '600' : '400'
                      }}
                      disabled={!day}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="booking-right-card">
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Select Time</h3>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader size={20} className="spinner" />
                    <span>Loading availability...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No available slots for this date</p>
                ) : (
                  availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px',
                        marginBottom: '8px',
                        borderRadius: '6px',
                        border: selectedSlot === slot ? '2px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                        backgroundColor: selectedSlot === slot ? 'rgba(139, 92, 246, 0.1)' : 'var(--surface-input)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: selectedSlot === slot ? '600' : '400'
                      }}
                    >
                      {slot.startTime && new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* STEP 3: Confirmation */}
          {step === 3 && createdHold && selectedService && (
            <div className="booking-left-card">
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                ✓ Hold Created
              </h3>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hold expires in:</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-purple)' }}>
                  {holdCountdown}
                </div>
              </div>
              <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--surface-input)' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Service:</strong> {selectedService.title}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Date:</strong> {selectedDate.toLocaleDateString()}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Time:</strong> {selectedSlot?.startTime && new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div>
                  <strong>Price:</strong> ${selectedService.pricing?.amount}
                </div>
              </div>

              <label style={{ display: 'block', marginBottom: '12px' }}>
                <span style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600' }}>
                  Additional Notes (Optional)
                </span>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Any special requests..."
                  style={{
                    width: '100%',
                    height: '60px',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--surface-input)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </label>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <div className="booking-left-card">
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle size={48} color="#10b981" style={{ marginBottom: '16px' }} />
                <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#10b981' }}>
                  Booking Confirmed!
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Your consultation booking is confirmed.<br/>
                  Check your email for details.
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Status: Payment Pending
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '12px', padding: '16px 0', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {step === 4 ? 'Close' : 'Cancel'}
          </button>
          {step === 4 && onProceedToPayment && (
            <button
              onClick={handleProceedPayment}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--accent-purple)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Proceed to Payment
            </button>
          )}
          {step < 4 && (
            <button
              onClick={step === 3 ? handleConfirmBooking : handleNext}
              disabled={loading || (step === 1 && !selectedService) || (step === 2 && !selectedSlot)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--accent-purple)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                opacity: (step === 1 && !selectedService) || (step === 2 && !selectedSlot) || loading ? 0.5 : 1
              }}
            >
              {loading ? <Loader size={16} className="spinner" /> : step === 3 ? 'Confirm Booking' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
