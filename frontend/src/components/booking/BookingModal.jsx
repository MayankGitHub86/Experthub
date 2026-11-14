import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import ExpertHubLogo from '../common/ExpertHubLogo';

export default function BookingModal({ expert, initialPackage, onClose, onProceedToPayment }) {
  const [step, setStep] = useState(1); // 1: Select Date, 2: Select Time, 3: Confirm
  const [selectedDay, setSelectedDay] = useState(18);
  const [selectedMonth, setSelectedMonth] = useState('June 2025');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:00 AM');
  const [clientName, setClientName] = useState('Alex Rivera');
  const [clientEmail, setClientEmail] = useState('alex.r@ventureflow.io');
  const [notes, setNotes] = useState('');

  if (!expert) return null;

  // Selected service details
  const serviceName = initialPackage?.title || initialPackage?.name || "Product Strategy Consultation";
  const servicePrice = initialPackage?.price || 199;
  const serviceDuration = initialPackage?.duration || "60 minutes";

  // Days for calendar June 2025
  const calendarDays = [
    { day: 1, inMonth: true },
    { day: 2, inMonth: true },
    { day: 3, inMonth: true },
    { day: 4, inMonth: true },
    { day: 5, inMonth: true },
    { day: 6, inMonth: true },
    { day: 7, inMonth: true },
    { day: 8, inMonth: true },
    { day: 9, inMonth: true },
    { day: 10, inMonth: true },
    { day: 11, inMonth: true },
    { day: 12, inMonth: true },
    { day: 13, inMonth: true },
    { day: 14, inMonth: true },
    { day: 15, inMonth: true },
    { day: 16, inMonth: true },
    { day: 17, inMonth: true },
    { day: 18, inMonth: true, active: true },
    { day: 19, inMonth: true },
    { day: 20, inMonth: true },
    { day: 21, inMonth: true },
    { day: 22, inMonth: true },
    { day: 23, inMonth: true },
    { day: 24, inMonth: true },
    { day: 25, inMonth: true },
    { day: 26, inMonth: true },
    { day: 27, inMonth: true },
    { day: 28, inMonth: true },
    { day: 29, inMonth: true },
    { day: 30, inMonth: true },
    { day: 1, inMonth: false },
    { day: 2, inMonth: false },
    { day: 3, inMonth: false },
    { day: 4, inMonth: false },
    { day: 5, inMonth: false },
  ];

  const timeSlots = [
    "09:00 AM",
    "10:00 AM",
    "11:30 AM",
    "01:00 PM",
    "02:30 PM",
    "04:00 PM"
  ];

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      if (onProceedToPayment) {
        onProceedToPayment({
          expert,
          package: {
            title: serviceName,
            price: servicePrice,
            duration: serviceDuration
          },
          date: `June ${selectedDay}, 2025`,
          slot: `${selectedTimeSlot}`,
          clientName,
          clientEmail,
          sessionNotes: notes
        });
      }
    }
  };

  return (
    <div className="exact-booking-overlay" onClick={onClose}>
      <div className="exact-booking-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Close Icon in Top Right */}
        <button className="booking-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        {/* Top Header - Exact match to Screenshot 1 */}
        <div className="exact-booking-header">
          <ExpertHubLogo size={34} />

          <div className="booking-help-contact">
            <span className="help-label">Need help?</span>
            <button className="support-link-btn">
              <MessageSquare size={15} color="#2563EB" />
              <span>Contact Support</span>
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar - Exact match to Screenshot 1 */}
        <div className="exact-booking-stepper">
          <div className="stepper-track-line" />

          {/* Step 1 */}
          <div className={`stepper-step-item ${step >= 1 ? 'completed' : ''} ${step === 1 ? 'current' : ''}`}>
            <div className="stepper-circle">
              1
            </div>
            <span className="stepper-title">Select Date</span>
          </div>

          <div className={`stepper-connector-bar ${step > 1 ? 'active' : ''}`} />

          {/* Step 2 */}
          <div className={`stepper-step-item ${step >= 2 ? 'completed' : ''} ${step === 2 ? 'current' : ''}`}>
            <div className="stepper-circle">
              2
            </div>
            <span className="stepper-title">Select Time</span>
          </div>

          <div className={`stepper-connector-bar ${step > 2 ? 'active' : ''}`} />

          {/* Step 3 */}
          <div className={`stepper-step-item ${step >= 3 ? 'completed' : ''} ${step === 3 ? 'current' : ''}`}>
            <div className="stepper-circle">
              3
            </div>
            <span className="stepper-title">Confirm</span>
          </div>
        </div>

        {/* 2-Column Content Layout - Exact match to Screenshot 1 */}
        <div className="exact-booking-body-grid">
          {/* Left Column Card: Calendar or Time Selector */}
          <div className="booking-left-card">
            {step === 1 && (
              <div className="calendar-picker-box">
                {/* Month Navigator */}
                <div className="calendar-month-nav">
                  <button className="cal-nav-arrow" onClick={() => setSelectedMonth('May 2025')}>
                    <ChevronLeft size={18} />
                  </button>
                  <h3 className="cal-month-title">{selectedMonth}</h3>
                  <button className="cal-nav-arrow" onClick={() => setSelectedMonth('July 2025')}>
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Days of Week Header */}
                <div className="calendar-weekdays-row">
                  <span>SUN</span>
                  <span>MON</span>
                  <span>TUE</span>
                  <span>WED</span>
                  <span>THU</span>
                  <span>FRI</span>
                  <span>SAT</span>
                </div>

                {/* Dates Grid */}
                <div className="calendar-dates-grid">
                  {calendarDays.map((d, index) => {
                    const isSelected = d.inMonth && selectedDay === d.day;
                    return (
                      <button
                        key={index}
                        className={`cal-date-cell ${!d.inMonth ? 'dimmed' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => d.inMonth && setSelectedDay(d.day)}
                        disabled={!d.inMonth}
                      >
                        {d.day}
                      </button>
                    );
                  })}
                </div>

                <div className="calendar-footer-timezone">
                  <CalendarIcon size={14} color="#2563EB" />
                  <span>All times are shown in your local time zone</span>
                </div>

                <div className="booking-step-action-row">
                  <button className="booking-primary-btn" onClick={handleNext}>
                    Next: Select Time <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="time-picker-box">
                <div className="time-picker-header">
                  <button className="time-back-btn" onClick={() => setStep(1)}>
                    <ChevronLeft size={16} /> Back to Date
                  </button>
                  <h3 className="cal-month-title">June {selectedDay}, 2025</h3>
                </div>

                <p className="time-picker-prompt">Select an available time slot for your consultation:</p>

                <div className="time-slots-grid">
                  {timeSlots.map((slot, i) => (
                    <button
                      key={i}
                      className={`time-slot-pill ${selectedTimeSlot === slot ? 'active' : ''}`}
                      onClick={() => setSelectedTimeSlot(slot)}
                    >
                      <Clock size={14} />
                      <span>{slot}</span>
                    </button>
                  ))}
                </div>

                <div className="booking-step-action-row">
                  <button className="booking-primary-btn" onClick={handleNext}>
                    Next: Review & Confirm <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="confirm-details-box">
                <div className="time-picker-header">
                  <button className="time-back-btn" onClick={() => setStep(2)}>
                    <ChevronLeft size={16} /> Back to Time
                  </button>
                  <h3 className="cal-month-title">Confirm Appointment</h3>
                </div>

                <div className="confirm-inputs-group">
                  <div className="confirm-field">
                    <label>Your Full Name</label>
                    <input 
                      type="text" 
                      value={clientName} 
                      onChange={(e) => setClientName(e.target.value)} 
                      placeholder="Alex Rivera"
                      className="confirm-text-input"
                    />
                  </div>

                  <div className="confirm-field">
                    <label>Email for Calendar Invite</label>
                    <input 
                      type="email" 
                      value={clientEmail} 
                      onChange={(e) => setClientEmail(e.target.value)} 
                      placeholder="alex@example.com"
                      className="confirm-text-input"
                    />
                  </div>

                  <div className="confirm-field">
                    <label>Topics or Questions for the Session</label>
                    <textarea 
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Briefly describe what you'd like to focus on..."
                      className="confirm-textarea"
                    />
                  </div>
                </div>

                <div className="booking-step-action-row">
                  <button className="booking-primary-btn" onClick={handleNext}>
                    <ShieldCheck size={16} />
                    Complete & Pay with Stripe (${servicePrice})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column Card: Booking Summary - Exact match to Screenshot 1 */}
          <div className="booking-right-summary-card">
            <h3 className="summary-card-title">Booking Summary</h3>

            {/* Expert Info Row */}
            <div className="summary-expert-profile">
              <img src={expert.avatar} alt={expert.name} className="summary-avatar" />
              <div className="summary-expert-text">
                <h4 className="summary-expert-name">{expert.name}</h4>
                <p className="summary-expert-sub">{expert.role}</p>
                <div className="summary-expert-rating">
                  <Star size={13} fill="#2563EB" color="#2563EB" />
                  <span className="rating-score">4.9</span>
                  <span className="rating-count">({expert.totalReviews || expert.reviewsCount || 128} reviews)</span>
                </div>
              </div>
            </div>

            <div className="summary-divider-line" />

            {/* Service Details */}
            <div className="summary-details-list">
              <div className="summary-detail-item">
                <div className="summary-detail-icon">
                  <FileText size={18} color="#2563EB" />
                </div>
                <div className="summary-detail-text">
                  <span className="detail-label">Service</span>
                  <strong className="detail-value">{serviceName}</strong>
                </div>
              </div>

              <div className="summary-detail-item">
                <div className="summary-detail-icon">
                  <Tag size={18} color="#2563EB" />
                </div>
                <div className="summary-detail-text">
                  <span className="detail-label">Price</span>
                  <strong className="detail-value price-blue">${servicePrice}</strong>
                </div>
              </div>

              <div className="summary-detail-item">
                <div className="summary-detail-icon">
                  <Clock size={18} color="#2563EB" />
                </div>
                <div className="summary-detail-text">
                  <span className="detail-label">Duration</span>
                  <strong className="detail-value">{serviceDuration}</strong>
                </div>
              </div>
            </div>

            {/* Alert Banner - Exact match to Screenshot 1 */}
            <div className="summary-alert-banner">
              <div className="alert-circle-icon">
                <Info size={16} />
              </div>
              <p className="alert-banner-text">
                {step === 1 
                  ? "You'll select a specific time for your appointment in the next step."
                  : step === 2
                  ? `Selected slot: June ${selectedDay}, 2025 at ${selectedTimeSlot}`
                  : `Appointment ready for confirmation with ${expert.name}.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
