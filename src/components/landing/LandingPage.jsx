import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Check, 
  ChevronRight, 
  Star, 
  CheckCircle, 
  FileText, 
  Users, 
  Calendar, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import ExpertHubLogo from '../common/ExpertHubLogo';
import { mockExperts } from '../../data/mockExperts';

export default function LandingPage({ 
  onLogin, 
  onGetStarted, 
  onNavigateToExperts, 
  onSelectExpertProfile,
  onBookExpert 
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Top 3 featured experts as shown in Screenshot 5
  const featuredExperts = [
    mockExperts.find(e => e.id === 'exp-sarah-chen') || mockExperts[1],
    mockExperts.find(e => e.id === 'exp-michael-rodriguez') || mockExperts[6] || mockExperts[0],
    mockExperts.find(e => e.id === 'exp-emma-johnson') || mockExperts[7] || mockExperts[2]
  ];

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (onNavigateToExperts) {
      onNavigateToExperts(searchQuery);
    } else if (onGetStarted) {
      onGetStarted();
    }
  };

  return (
    <div className="landing-page-exact">
      {/* Top Navigation Bar - Exact match to Screenshot 5 */}
      <nav className="exact-nav-bar">
        <div className="exact-nav-container">
          <div className="exact-nav-left" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ExpertHubLogo size={36} />
          </div>

          <div className="exact-nav-links">
            <button className="nav-link-text-btn" onClick={() => onNavigateToExperts && onNavigateToExperts()}>
              Find Experts
            </button>
            <a href="#how-it-works" className="nav-link-text-btn">
              How it Works
            </a>
            <a href="#pricing" className="nav-link-text-btn" onClick={() => onNavigateToExperts && onNavigateToExperts()}>
              Pricing
            </a>
          </div>

          <div className="exact-nav-actions">
            <button className="exact-nav-login-btn" onClick={onLogin}>
              Login
            </button>
            <button className="exact-nav-get-started-btn" onClick={onGetStarted}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Exact match to Screenshot 5 */}
      <section className="exact-hero-section">
        <div className="exact-hero-container">
          <div className="exact-hero-content">
            <h1 className="exact-hero-title">
              Find the Right Expert,<br />
              <span className="exact-hero-blue-text">Instantly</span>
            </h1>
            <p className="exact-hero-sub">
              Connect with verified professionals and get expert advice tailored to your needs.
            </p>

            {/* Elevated Search Bar Card */}
            <form className="exact-hero-search-box" onSubmit={handleSearchSubmit}>
              <Sparkles size={18} className="exact-sparkle-icon" />
              <input 
                type="text" 
                placeholder="Describe what you need help with..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="exact-search-input"
              />
              <button type="submit" className="exact-search-submit-btn">
                <Search size={16} />
                <span>Search Experts</span>
              </button>
            </form>

            {/* Checkmark Pills Row */}
            <div className="exact-hero-checks-row">
              <div className="exact-hero-check-pill">
                <span className="pill-check-icon">✓</span>
                <span>AI-Powered Matching</span>
              </div>
              <div className="exact-hero-check-pill">
                <span className="pill-check-icon">✓</span>
                <span>Verified Experts</span>
              </div>
              <div className="exact-hero-check-pill">
                <span className="pill-check-icon">✓</span>
                <span>Secure & Simple</span>
              </div>
            </div>
          </div>

          {/* Right Hero Illustration - SVG Team Collaboration Scene */}
          <div className="exact-hero-illustration">
            <svg viewBox="0 0 520 380" className="exact-illustration-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="globeGrad" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
                  <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.7"/>
                  <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0"/>
                </radialGradient>
                <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF"/>
                  <stop offset="100%" stopColor="#F8FAFC"/>
                </linearGradient>
                <linearGradient id="jacketGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2563EB"/>
                  <stop offset="100%" stopColor="#1D4ED8"/>
                </linearGradient>
              </defs>

              {/* Background Globe Lat/Long grid */}
              <circle cx="340" cy="180" r="150" fill="url(#globeGrad)"/>
              <ellipse cx="340" cy="180" rx="140" ry="60" stroke="#BFDBFE" strokeWidth="1.5" strokeDasharray="4 4"/>
              <ellipse cx="340" cy="180" rx="60" ry="140" stroke="#BFDBFE" strokeWidth="1.5" strokeDasharray="4 4"/>
              <line x1="200" y1="180" x2="480" y2="180" stroke="#BFDBFE" strokeWidth="1.5"/>

              {/* Floating Chart Card (Left) */}
              <g transform="translate(110, 110)">
                <rect width="90" height="75" rx="10" fill="#FFFFFF" filter="drop-shadow(0 8px 20px rgba(37,99,235,0.12))" stroke="#DBEAFE"/>
                <rect x="12" y="42" width="12" height="22" rx="3" fill="#BFDBFE"/>
                <rect x="28" y="28" width="12" height="36" rx="3" fill="#60A5FA"/>
                <rect x="44" y="16" width="12" height="48" rx="3" fill="#2563EB"/>
                <rect x="60" y="34" width="12" height="30" rx="3" fill="#93C5FD"/>
                <path d="M12 40 L28 26 L44 14 L60 32" stroke="#1D4ED8" strokeWidth="2" fill="none"/>
              </g>

              {/* Floating Avatar 1 (Top Left) */}
              <g transform="translate(190, 50)">
                <circle cx="28" cy="28" r="26" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="2" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.06))"/>
                <circle cx="28" cy="24" r="10" fill="#CBD5E1"/>
                <path d="M16 44 C16 36 22 34 28 34 C34 34 40 36 40 44" fill="#64748B"/>
              </g>

              {/* Floating Chat Bubble (Top Center) */}
              <g transform="translate(290, 42)">
                <rect width="48" height="34" rx="8" fill="#2563EB" filter="drop-shadow(0 6px 14px rgba(37,99,235,0.25))"/>
                <path d="M30 34 L36 40 L36 34 Z" fill="#2563EB"/>
                <circle cx="16" cy="17" r="2.5" fill="#FFFFFF"/>
                <circle cx="24" cy="17" r="2.5" fill="#FFFFFF"/>
                <circle cx="32" cy="17" r="2.5" fill="#FFFFFF"/>
              </g>

              {/* Floating Avatar 2 (Top Right) */}
              <g transform="translate(410, 55)">
                <circle cx="26" cy="26" r="24" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="2" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.06))"/>
                <circle cx="26" cy="22" r="9" fill="#F87171"/>
                <path d="M15 41 C15 33 21 31 26 31 C31 31 37 33 37 41" fill="#1E293B"/>
              </g>

              {/* Floating Checkmark Circle (Right) */}
              <g transform="translate(440, 150)">
                <circle cx="16" cy="16" r="16" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.08))"/>
                <path d="M10 16 L14 20 L22 12" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </g>

              {/* Meeting Desk */}
              <rect x="140" y="275" width="280" height="12" rx="4" fill="#94A3B8"/>
              <rect x="150" y="287" width="10" height="50" rx="2" fill="#CBD5E1"/>
              <rect x="390" y="287" width="10" height="50" rx="2" fill="#CBD5E1"/>

              {/* Coffee Mug */}
              <rect x="235" y="260" width="14" height="15" rx="3" fill="#FFFFFF" stroke="#CBD5E1"/>
              <path d="M249 264 C252 264 252 271 249 271" stroke="#CBD5E1" strokeWidth="2" fill="none"/>

              {/* Open Laptop on Table */}
              <polygon points="260,250 310,250 318,275 252,275" fill="#E2E8F0"/>
              <polygon points="264,248 306,248 304,215 266,215" fill="#475569" rx="2"/>
              <polygon points="267,245 303,245 301,218 269,218" fill="#F8FAFC"/>
              <circle cx="285" cy="231" r="3" fill="#2563EB"/>

              {/* Potted Plant (Far Right) */}
              <g transform="translate(450, 240)">
                <path d="M10 35 L4 55 L26 55 L20 35 Z" fill="#F1F5F9" stroke="#CBD5E1"/>
                <path d="M15 35 Q5 15 0 25 Q10 30 15 35 Z" fill="#10B981"/>
                <path d="M15 35 Q15 5 20 18 Q20 30 15 35 Z" fill="#34D399"/>
                <path d="M15 35 Q25 15 30 25 Q20 30 15 35 Z" fill="#059669"/>
              </g>

              {/* Character 1 (Left / Advisor Woman) */}
              <g transform="translate(195, 140)">
                {/* Hair */}
                <circle cx="45" cy="40" r="24" fill="#0F172A"/>
                {/* Face */}
                <ellipse cx="46" cy="44" rx="14" ry="16" fill="#FED7AA"/>
                {/* Shirt */}
                <path d="M38 60 L54 60 L58 76 L34 76 Z" fill="#FFFFFF"/>
                {/* Blue Blazer */}
                <path d="M22 66 C28 58 40 56 46 56 C52 56 64 58 70 66 L80 135 L60 135 L52 84 L40 84 L32 135 L12 135 Z" fill="url(#jacketGrad)"/>
                {/* Gesturing Hand */}
                <path d="M68 85 Q82 88 95 82 Q90 94 76 96 Z" fill="#FED7AA"/>
              </g>

              {/* Character 2 (Right / Client Man) */}
              <g transform="translate(370, 145)">
                {/* Hair */}
                <circle cx="35" cy="38" r="22" fill="#0F172A"/>
                {/* Face */}
                <ellipse cx="33" cy="42" rx="13" ry="15" fill="#FED7AA"/>
                {/* Dark Jacket */}
                <path d="M12 66 C18 58 28 56 34 56 C40 56 50 58 56 66 L66 130 L48 130 L42 80 L28 80 L22 130 L4 130 Z" fill="#1E293B"/>
                {/* Inner Shirt Collar */}
                <path d="M28 58 L40 58 L34 68 Z" fill="#60A5FA"/>
                {/* Hand on Table */}
                <ellipse cx="14" cy="125" rx="8" ry="5" fill="#FED7AA"/>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* Featured Experts Section - Exact match to Screenshot 5 */}
      <section className="exact-featured-section">
        <div className="exact-section-container">
          <div className="exact-section-header-row">
            <h2 className="exact-section-title">Featured Experts</h2>
            <button className="exact-view-all-link" onClick={() => onNavigateToExperts && onNavigateToExperts()}>
              View all experts <ChevronRight size={16} />
            </button>
          </div>

          <div className="exact-featured-cards-grid">
            {featuredExperts.map((expert) => (
              <div 
                key={expert.id} 
                className="exact-featured-expert-card"
                onClick={() => onSelectExpertProfile && onSelectExpertProfile(expert)}
              >
                <div className="exact-card-main">
                  <div className="exact-card-avatar-wrap">
                    <img src={expert.avatar} alt={expert.name} className="exact-card-avatar" />
                  </div>

                  <div className="exact-card-details">
                    <div className="exact-card-name-row">
                      <h3 className="exact-card-name">{expert.name}</h3>
                      <CheckCircle size={15} fill="#2563EB" color="#FFFFFF" className="exact-verified-icon" />
                    </div>
                    <p className="exact-card-role">{expert.role}</p>

                    <div className="exact-card-tags">
                      {expert.skills?.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="exact-skill-pill">{tag}</span>
                      ))}
                    </div>

                    <div className="exact-card-bottom-row">
                      <div className="exact-card-rating">
                        <Star size={14} fill="#F59E0B" color="#F59E0B" />
                        <span className="rating-num">{expert.rating}</span>
                        <span className="reviews-num">({expert.totalReviews || expert.reviewsCount} reviews)</span>
                      </div>

                      <div className="exact-card-rate-col">
                        <span className="rate-amount">${expert.hourlyRate}/hr</span>
                        <button 
                          className="exact-book-outline-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onBookExpert) onBookExpert(expert);
                            else if (onSelectExpertProfile) onSelectExpertProfile(expert);
                          }}
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section - Exact match to Screenshot 5 */}
      <section className="exact-how-it-works-section" id="how-it-works">
        <div className="exact-section-container">
          <h2 className="exact-center-title">How It Works</h2>

          <div className="exact-steps-flow">
            {/* Step 1 */}
            <div className="exact-step-item">
              <div className="exact-step-icon-bubble">
                <FileText size={24} color="#2563EB" />
                <span className="step-num-badge">1</span>
              </div>
              <h3 className="exact-step-heading">Describe Your Need</h3>
              <p className="exact-step-desc">
                Tell us what you need help with using our AI search.
              </p>
            </div>

            <div className="exact-step-connector" />

            {/* Step 2 */}
            <div className="exact-step-item">
              <div className="exact-step-icon-bubble">
                <Users size={24} color="#2563EB" />
                <span className="step-num-badge">2</span>
              </div>
              <h3 className="exact-step-heading">Get Matched</h3>
              <p className="exact-step-desc">
                Our AI matches you with the best experts for your needs.
              </p>
            </div>

            <div className="exact-step-connector" />

            {/* Step 3 */}
            <div className="exact-step-item">
              <div className="exact-step-icon-bubble">
                <Calendar size={24} color="#2563EB" />
                <span className="step-num-badge">3</span>
              </div>
              <h3 className="exact-step-heading">Book a Session</h3>
              <p className="exact-step-desc">
                Choose a time that works for you and book instantly.
              </p>
            </div>

            <div className="exact-step-connector" />

            {/* Step 4 */}
            <div className="exact-step-item">
              <div className="exact-step-icon-bubble">
                <MessageSquare size={24} color="#2563EB" />
                <span className="step-num-badge">4</span>
              </div>
              <h3 className="exact-step-heading">Get Expert Help</h3>
              <p className="exact-step-desc">
                Connect, collaborate, and achieve your goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="exact-landing-footer">
        <div className="exact-section-container">
          <div className="exact-footer-inner">
            <div className="exact-footer-brand">
              <ExpertHubLogo size={32} />
              <p>The on-demand executive and specialist consultation platform.</p>
            </div>
            <div className="exact-footer-links">
              <button onClick={() => onNavigateToExperts && onNavigateToExperts()}>Find Experts</button>
              <a href="#how-it-works">How It Works</a>
              <button onClick={onLogin}>Sign In</button>
              <button onClick={onGetStarted}>Sign Up</button>
            </div>
          </div>
          <div className="exact-footer-bottom">
            <span>© 2026 ExpertHub Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
