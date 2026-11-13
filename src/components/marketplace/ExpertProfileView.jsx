import React, { useState } from 'react';
import { 
  Star, 
  CheckCircle, 
  MessageSquare, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Rocket, 
  BarChart3, 
  Target,
  ArrowLeft
} from 'lucide-react';
import ExpertHubLogo from '../common/ExpertHubLogo';

export default function ExpertProfileView({ 
  expert, 
  onBack, 
  onBookConsultation, 
  onBookService,
  onNavigateToExperts,
  onLogin,
  onSignUp
}) {
  const [activeTab, setActiveTab] = useState('about');

  if (!expert) return null;

  const defaultServices = [
    {
      id: "srv-1",
      name: "Strategy Session",
      desc: "A focused 1:1 session to tackle your top business challenge and define clear next steps.",
      duration: "60 mins",
      price: 199,
      icon: Rocket
    },
    {
      id: "srv-2",
      name: "Growth Deep Dive",
      desc: "In-depth analysis of your growth opportunities with a custom strategy roadmap.",
      duration: "90 mins",
      price: 399,
      icon: BarChart3
    },
    {
      id: "srv-3",
      name: "Growth Partnership",
      desc: "Ongoing advisory support to execute and optimize your growth strategy over time.",
      duration: "4 weeks",
      price: 1199,
      icon: Target
    }
  ];

  const services = expert.services?.length ? expert.services.map(s => ({
    ...s,
    icon: s.icon === 'bar-chart' ? BarChart3 : s.icon === 'target' ? Target : Rocket
  })) : defaultServices;

  const defaultReviews = [
    {
      id: "rev-1",
      authorName: "Sarah Johnson",
      authorAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&auto=format&fit=crop&q=80",
      rating: 5.0,
      timeAgo: "2 weeks ago",
      text: "Alex provided actionable insights that immediately impacted our growth. Highly recommend!"
    },
    {
      id: "rev-2",
      authorName: "Michael Chen",
      authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
      rating: 5.0,
      timeAgo: "1 month ago",
      text: "Excellent strategic thinking and clear communication. Helped us break through a growth plateau."
    },
    {
      id: "rev-3",
      authorName: "Emily Davis",
      authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
      rating: 5.0,
      timeAgo: "1 month ago",
      text: "Alex is knowledgeable, responsive, and truly invested in your success."
    }
  ];

  const reviews = expert.reviews?.length ? expert.reviews : defaultReviews;

  const specialties = expert.specialties || [
    "Growth Strategy",
    "Go-to-Market",
    "Customer Acquisition",
    "Revenue Optimization",
    "Product Strategy",
    "Analytics"
  ];

  return (
    <div className="exact-profile-page">
      {/* Top Header - Exact match to Screenshot 4 */}
      <header className="exact-profile-header">
        <div className="exact-profile-header-inner">
          <div className="profile-logo-wrap" onClick={onBack}>
            <ExpertHubLogo size={36} variant="black" />
          </div>

          <nav className="profile-nav-links">
            <button className="profile-nav-btn" onClick={() => onNavigateToExperts && onNavigateToExperts()}>
              Find Experts
            </button>
            <button className="profile-nav-btn" onClick={onBack}>
              How It Works
            </button>
            <button className="profile-nav-btn">
              For Business
            </button>
          </nav>

          <div className="profile-header-actions">
            <button className="profile-login-btn" onClick={onLogin}>
              Log In
            </button>
            <button className="profile-signup-btn" onClick={onSignUp}>
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Main Profile Container */}
      <div className="exact-profile-main-container">
        {onBack && (
          <button className="profile-back-link-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Back to Experts</span>
          </button>
        )}

        {/* Profile Hero Banner Card - Exact match to Screenshot 4 */}
        <div className="exact-profile-hero-card">
          <div className="profile-hero-avatar-col">
            <img src={expert.avatar} alt={expert.name} className="profile-big-avatar" />
          </div>

          <div className="profile-hero-info-col">
            <div className="profile-hero-name-row">
              <h1 className="profile-expert-name">{expert.name}</h1>
              <span className="profile-verified-badge-blue">
                <CheckCircle size={22} fill="#2563EB" color="#FFFFFF" />
              </span>
            </div>

            <div className="profile-hero-stars-row">
              <div className="profile-stars-group">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="#F59E0B" color="#F59E0B" />
                ))}
              </div>
              <span className="profile-rating-score">{expert.rating || 4.9}</span>
              <span className="profile-rating-reviews">({expert.totalReviews || expert.reviewsCount || 128} reviews)</span>
            </div>

            <div className="profile-response-pill">
              <Clock size={14} color="#2563EB" />
              <span>{expert.usuallyResponds || "Usually responds in 2 hours"}</span>
            </div>
          </div>

          <div className="profile-hero-actions-col">
            <button className="profile-message-outline-btn">
              <MessageSquare size={16} />
              <span>Message</span>
            </button>

            <button 
              className="profile-book-primary-btn"
              onClick={() => onBookConsultation && onBookConsultation(expert)}
            >
              <Calendar size={16} />
              <span>Book Consultation</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation - Exact match to Screenshot 4 */}
        <div className="exact-profile-tabs-bar">
          <button 
            className={`profile-tab-item ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
          <button 
            className={`profile-tab-item ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            Services
          </button>
          <button 
            className={`profile-tab-item ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews
          </button>
        </div>

        {/* 3-Column Content Layout - Exact match to Screenshot 4 */}
        <div className="exact-profile-content-grid">
          {/* Left Column: About & Specialties */}
          <div className="profile-col-about">
            <h3 className="profile-section-heading">About</h3>
            <p className="profile-bio-text">
              {expert.bio || "Hi, I'm Alex Morgan, a growth strategy consultant with over 10 years of experience helping startups and established businesses scale sustainably. I specialize in go-to-market strategy, customer acquisition, and revenue optimization. My approach is data-driven, practical, and tailored to your unique business goals."}
            </p>

            <h4 className="profile-sub-heading">Specialties</h4>
            <div className="profile-specialties-chips">
              {specialties.map((spec, i) => (
                <span key={i} className="profile-spec-pill">{spec}</span>
              ))}
            </div>
          </div>

          {/* Middle Column: Services */}
          <div className="profile-col-services">
            <h3 className="profile-section-heading">Services</h3>
            <div className="profile-services-list">
              {services.map((srv) => {
                const IconComponent = srv.icon;
                return (
                  <div key={srv.id} className="profile-service-card">
                    <div className="service-card-icon-wrap">
                      <IconComponent size={20} color="#2563EB" />
                    </div>
                    <h4 className="service-card-title">{srv.name}</h4>
                    <p className="service-card-desc">{srv.desc}</p>
                    <div className="service-card-duration">
                      <Clock size={13} color="#64748B" />
                      <span>{srv.duration}</span>
                    </div>
                    <div className="service-card-price-row">
                      <span className="service-card-price">${srv.price.toLocaleString()}</span>
                      <button 
                        className="service-book-now-btn"
                        onClick={() => onBookService ? onBookService(expert, srv) : onBookConsultation(expert, srv)}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Reviews */}
          <div className="profile-col-reviews">
            <div className="profile-reviews-header">
              <h3 className="profile-section-heading">Reviews</h3>
              <button className="profile-see-all-reviews">See all reviews</button>
            </div>

            <div className="profile-reviews-list">
              {reviews.map((rev) => (
                <div key={rev.id} className="profile-review-card">
                  <div className="profile-review-author-row">
                    <img src={rev.authorAvatar} alt={rev.authorName} className="review-author-avatar" />
                    <div className="review-author-info">
                      <strong className="review-author-name">{rev.authorName}</strong>
                      <div className="review-stars-timestamp-row">
                        <div className="review-mini-stars">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={13} fill="#F59E0B" color="#F59E0B" />
                          ))}
                        </div>
                        <span className="review-score">5.0</span>
                        <span className="review-timestamp">{rev.timeAgo}</span>
                      </div>
                    </div>
                  </div>

                  <p className="profile-review-body">
                    {rev.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
