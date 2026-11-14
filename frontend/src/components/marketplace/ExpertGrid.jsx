import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Star, 
  Clock, 
  CheckCircle, 
  RotateCcw, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  MessageSquareText, 
  Lock, 
  Bookmark,
  SlidersHorizontal
} from 'lucide-react';
import ExpertHubLogo from '../common/ExpertHubLogo';
import { mockExperts, mockCategories } from '../../data/mockExperts';

export default function ExpertGrid({ 
  onBook, 
  onViewProfile, 
  onOpenAIMatcher,
  onNavigateHome,
  onLogin,
  onSignUp
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [rateRange, setRateRange] = useState(500);
  const [minRating, setMinRating] = useState('4.0');
  const [sortBy, setSortBy] = useState('Relevance');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter experts based on selected inputs
  const filteredExperts = useMemo(() => {
    return mockExperts.filter(expert => {
      // Search text
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = expert.name.toLowerCase().includes(q);
        const matchesRole = expert.role.toLowerCase().includes(q);
        const matchesSkills = expert.skills?.some(s => s.toLowerCase().includes(q));
        if (!matchesName && !matchesRole && !matchesSkills) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const catObj = mockCategories.find(c => c.id === selectedCategory);
        if (catObj && expert.category !== catObj.name) {
          return false;
        }
      }

      // Hourly rate
      if (expert.hourlyRate > rateRange) return false;

      // Rating
      if (expert.rating < parseFloat(minRating)) return false;

      return true;
    });
  }, [searchQuery, selectedCategory, rateRange, minRating]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSpecialty('All Specialties');
    setRateRange(500);
    setMinRating('4.0');
    setSortBy('Relevance');
  };

  return (
    <div className="exact-directory-page">
      {/* Top Header Bar - Exact match to Screenshot 3 */}
      <header className="exact-directory-header">
        <div className="exact-dir-header-inner">
          <div className="exact-dir-brand" onClick={() => onNavigateHome && onNavigateHome()}>
            <ExpertHubLogo size={36} />
          </div>

          <nav className="exact-dir-nav">
            <button className="exact-dir-nav-link active">Find Experts</button>
            <button className="exact-dir-nav-link" onClick={() => onNavigateHome && onNavigateHome()}>How It Works</button>
            <button className="exact-dir-nav-link">Pricing</button>
            <div className="exact-dir-dropdown-wrap">
              <button className="exact-dir-nav-link">
                Resources <ChevronDown size={14} />
              </button>
            </div>
          </nav>

          <div className="exact-dir-actions">
            <button className="exact-dir-bookmark-btn" title="Saved Experts">
              <Bookmark size={18} />
            </button>
            <button className="exact-dir-login-btn" onClick={onLogin}>
              Log In
            </button>
            <button className="exact-dir-signup-btn" onClick={onSignUp}>
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Top Horizontal Filter Bar - Exact match to Screenshot 3 */}
      <div className="exact-top-filter-bar">
        <div className="exact-filter-bar-inner">
          {/* Keyword Search */}
          <div className="filter-search-wrap">
            <Search size={16} className="filter-search-icon" />
            <input 
              type="text" 
              placeholder="Search experts by name, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-search-input"
            />
          </div>

          {/* Specialties Dropdown */}
          <div className="filter-select-wrap">
            <select 
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="filter-dropdown-select"
            >
              <option value="All Specialties">All Specialties</option>
              <option value="Business Strategy">Business Strategy</option>
              <option value="Product Strategy">Product Strategy</option>
              <option value="UX Design">UX Design</option>
              <option value="AI & ML">AI & ML</option>
              <option value="Finance">Finance</option>
              <option value="Leadership">Leadership</option>
            </select>
          </div>

          {/* Hourly Rate Slider */}
          <div className="filter-slider-wrap">
            <div className="filter-slider-labels">
              <span className="slider-title">Hourly Rate: $50 - ${rateRange}+</span>
            </div>
            <input 
              type="range" 
              min="50" 
              max="500" 
              step="25"
              value={rateRange}
              onChange={(e) => setRateRange(Number(e.target.value))}
              className="filter-range-input"
            />
            <div className="slider-ticks-row">
              <span>$50</span>
              <span>$500+</span>
            </div>
          </div>

          {/* Minimum Rating Dropdown */}
          <div className="filter-rating-wrap">
            <span className="rating-label">Minimum Rating</span>
            <select 
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="filter-rating-select"
            >
              <option value="4.0">⭐ 4.0+ Stars</option>
              <option value="4.5">⭐ 4.5+ Stars</option>
              <option value="4.8">⭐ 4.8+ Stars</option>
              <option value="3.0">⭐ 3.0+ Stars</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <button className="filter-clear-btn" onClick={handleClearFilters}>
            <RotateCcw size={14} />
            <span>Clear Filters</span>
          </button>
        </div>
      </div>

      {/* Main Content: Sidebar + Grid - Exact match to Screenshot 3 */}
      <div className="exact-directory-body">
        <div className="exact-body-container">
          {/* Left Sidebar */}
          <aside className="exact-dir-sidebar">
            <div className="sidebar-categories-card">
              <h3 className="sidebar-group-title">Categories</h3>
              <ul className="sidebar-category-list">
                {mockCategories.map((cat) => (
                  <li 
                    key={cat.id} 
                    className={`sidebar-category-item ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span className="category-name">{cat.name}</span>
                    <span className="category-count">{cat.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Why ExpertHub Trust Card */}
            <div className="sidebar-trust-card">
              <h4 className="trust-card-title">Why ExpertHub?</h4>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <ShieldCheck size={20} color="#2563EB" />
                </div>
                <div className="trust-text">
                  <strong>All experts are verified</strong>
                  <p>Identity and credentials verified</p>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <MessageSquareText size={20} color="#2563EB" />
                </div>
                <div className="trust-text">
                  <strong>High-quality consultations</strong>
                  <p>Experts are rated by clients</p>
                </div>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <Lock size={20} color="#2563EB" />
                </div>
                <div className="trust-text">
                  <strong>Secure & private</strong>
                  <p>Your data is always protected</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Grid */}
          <main className="exact-dir-grid-area">
            <div className="dir-results-header">
              <span className="results-count-text">
                Showing 1-{Math.min(6, filteredExperts.length)} of 1,248 experts
              </span>

              <div className="results-sort-box">
                <span>Sort by:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="results-sort-select"
                >
                  <option value="Relevance">Relevance</option>
                  <option value="Highest Rated">Highest Rated</option>
                  <option value="Price: Low to High">Price: Low to High</option>
                  <option value="Price: High to Low">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* 6 Expert Cards Grid - Exact match to Screenshot 3 */}
            <div className="exact-experts-grid">
              {filteredExperts.slice(0, 6).map((expert) => (
                <div 
                  key={expert.id} 
                  className="exact-expert-card"
                  onClick={() => onViewProfile && onViewProfile(expert)}
                >
                  <div className="expert-card-top-row">
                    <img src={expert.avatar} alt={expert.name} className="expert-card-avatar" />
                    
                    <div className="expert-card-info-col">
                      <div className="expert-name-badge-row">
                        <h4 className="expert-card-name">{expert.name}</h4>
                        <span className="verified-green-pill">
                          <CheckCircle size={12} fill="#10B981" color="#FFFFFF" />
                          <span>Verified</span>
                        </span>
                      </div>

                      <div className="expert-skills-tags-row">
                        {expert.skills?.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="expert-skill-chip">{skill}</span>
                        ))}
                      </div>

                      <div className="expert-rating-inline">
                        <Star size={13} fill="#F59E0B" color="#F59E0B" />
                        <span className="rating-bold">{expert.rating}</span>
                        <span className="rating-count">({expert.totalReviews || expert.reviewsCount} reviews)</span>
                      </div>
                    </div>
                  </div>

                  {/* Hourly Rate & Avg Response */}
                  <div className="expert-card-meta-row">
                    <div className="meta-col">
                      <span className="meta-value blue">${expert.hourlyRate} <small>/hr</small></span>
                      <span className="meta-sub">Hourly Rate</span>
                    </div>
                    <div className="meta-divider" />
                    <div className="meta-col">
                      <span className="meta-value">
                        <Clock size={12} className="meta-clock-icon" />
                        {expert.responseTime || 'Within 1 hour'}
                      </span>
                      <span className="meta-sub">Avg. Response</span>
                    </div>
                  </div>

                  {/* Solid Blue Book Consultation Button */}
                  <button 
                    className="expert-card-book-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onBook) onBook(expert);
                      else if (onViewProfile) onViewProfile(expert);
                    }}
                  >
                    Book Consultation
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination - Exact match to Screenshot 3 */}
            <div className="exact-pagination-row">
              <button 
                className="page-nav-arrow" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                className={`page-number-btn ${currentPage === 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(1)}
              >
                1
              </button>
              <button 
                className={`page-number-btn ${currentPage === 2 ? 'active' : ''}`}
                onClick={() => setCurrentPage(2)}
              >
                2
              </button>
              <button 
                className={`page-number-btn ${currentPage === 3 ? 'active' : ''}`}
                onClick={() => setCurrentPage(3)}
              >
                3
              </button>
              <span className="page-ellipsis">...</span>
              <button 
                className="page-number-btn"
                onClick={() => setCurrentPage(208)}
              >
                208
              </button>
              <button 
                className="page-nav-arrow"
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
