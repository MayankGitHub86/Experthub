import React, { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronLeft, Save, Upload, X, AlertCircle, CheckCircle,
  Briefcase, Clock, DollarSign, Globe, User, FileText
} from 'lucide-react';
import expertsAPI from '../../api/experts.js';
import servicesAPI from '../../api/services.js';
import availabilityAPI from '../../api/availability.js';

const PROFILE_STEPS = [
  { id: 'basic', label: 'Basic Info', icon: User },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'availability', label: 'Availability', icon: Clock },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'review', label: 'Review', icon: FileText },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMEZONES = [
  'UTC', 'EST', 'CST', 'MST', 'PST', 'GMT', 'CET', 'IST', 'JST', 'AEST'
];

export default function ExpertProfileForm({ onComplete, theme }) {
  const isLight = theme === 'light';
  const accentColor = isLight ? '#2563eb' : '#8b5cf6';

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Basic Info
    headline: '',
    bio: '',
    category: '',
    skills: [],
    specialties: [],
    languages: [],

    // Professional
    documents: [],
    experience: '',
    education: '',

    // Availability
    timezone: 'UTC',
    weeklySchedule: {
      Monday: { start: '09:00', end: '17:00', available: true },
      Tuesday: { start: '09:00', end: '17:00', available: true },
      Wednesday: { start: '09:00', end: '17:00', available: true },
      Thursday: { start: '09:00', end: '17:00', available: true },
      Friday: { start: '09:00', end: '17:00', available: true },
      Saturday: { start: '10:00', end: '14:00', available: false },
      Sunday: { start: '', end: '', available: false },
    },
    bufferMinutes: 15,
    minNoticeHours: 24,
    maxAdvanceDays: 60,

    // Pricing
    hourlyRate: '',
    profilePublic: true,
    acceptingBookings: true,
  });

  const [skillInput, setSkillInput] = useState('');
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [languageInput, setLanguageInput] = useState('');

  // Load existing profile if available
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await expertsAPI.getMyProfile();
      if (profile) {
        setFormData(prev => ({
          ...prev,
          headline: profile.headline || '',
          bio: profile.bio || '',
          category: profile.category || '',
          skills: profile.skills || [],
          specialties: profile.specialties || [],
          languages: profile.languages || [],
          timezone: profile.availability?.timezone || 'UTC',
          weeklySchedule: profile.availability?.weeklySchedule || prev.weeklySchedule,
          bufferMinutes: profile.availability?.bufferMinutes || 15,
          minNoticeHours: profile.availability?.minNoticeHours || 24,
          maxAdvanceDays: profile.availability?.maxAdvanceDays || 60,
          hourlyRate: profile.hourlyRate || '',
          profilePublic: profile.profilePublic !== false,
          acceptingBookings: profile.acceptingBookings !== false,
          documents: profile.documents || [],
        }));
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      // It's okay if profile doesn't exist yet (new expert)
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleScheduleChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      weeklySchedule: {
        ...prev.weeklySchedule,
        [day]: {
          ...prev.weeklySchedule[day],
          [field]: value,
        },
      },
    }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  const addSpecialty = () => {
    if (specialtyInput.trim() && !formData.specialties.includes(specialtyInput.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialtyInput.trim()],
      }));
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (specialty) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty),
    }));
  };

  const addLanguage = () => {
    if (languageInput.trim() && !formData.languages.includes(languageInput.trim())) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, languageInput.trim()],
      }));
      setLanguageInput('');
    }
  };

  const removeLanguage = (language) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language),
    }));
  };

  const validateStep = () => {
    const step = PROFILE_STEPS[currentStep].id;

    if (step === 'basic') {
      return formData.headline.trim() && formData.bio.trim() && formData.category && formData.skills.length > 0;
    }
    if (step === 'pricing') {
      return formData.hourlyRate > 0;
    }

    return true;
  };

  const handleSave = async () => {
    try {
      if (!validateStep()) {
        setError('Please fill in all required fields');
        return;
      }

      setSaving(true);
      setError(null);

      // Prepare data for API
      const profileData = {
        headline: formData.headline,
        bio: formData.bio,
        category: formData.category,
        skills: formData.skills,
        specialties: formData.specialties,
        languages: formData.languages,
        hourlyRate: parseFloat(formData.hourlyRate),
        profilePublic: formData.profilePublic,
        acceptingBookings: formData.acceptingBookings,
        availability: {
          timezone: formData.timezone,
          weeklySchedule: formData.weeklySchedule,
          bufferMinutes: formData.bufferMinutes,
          minNoticeHours: formData.minNoticeHours,
          maxAdvanceDays: formData.maxAdvanceDays,
        },
      };

      await expertsAPI.updateMyProfile(profileData);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Move to next step if not on last step
      if (currentStep < PROFILE_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      setError(null);

      // Save final data
      const profileData = {
        headline: formData.headline,
        bio: formData.bio,
        category: formData.category,
        skills: formData.skills,
        specialties: formData.specialties,
        languages: formData.languages,
        hourlyRate: parseFloat(formData.hourlyRate),
        profilePublic: formData.profilePublic,
        acceptingBookings: formData.acceptingBookings,
        availability: {
          timezone: formData.timezone,
          weeklySchedule: formData.weeklySchedule,
          bufferMinutes: formData.bufferMinutes,
          minNoticeHours: formData.minNoticeHours,
          maxAdvanceDays: formData.maxAdvanceDays,
        },
      };

      await expertsAPI.updateMyProfile(profileData);
      setSuccess(true);

      if (onComplete) {
        setTimeout(onComplete, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Step Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        {PROFILE_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = idx === currentStep;
          const isComplete = idx < currentStep;

          return (
            <div key={step.id} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive ? accentColor : isComplete ? '#10b981' : 'var(--surface-input)',
                  color: isActive || isComplete ? '#fff' : 'var(--text-muted)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: isActive ? `2px solid ${accentColor}` : 'none',
                }}
                onClick={() => setCurrentStep(idx)}
                title={step.label}
              >
                {isComplete ? <CheckCircle size={20} /> : <StepIcon size={16} />}
              </div>

              {idx < PROFILE_STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    backgroundColor: isComplete || isActive ? accentColor : 'var(--border-subtle)',
                    margin: '0 8px',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} color="#dc2626" />
          <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={16} color="#16a34a" />
          <span style={{ fontSize: '13px', color: '#16a34a' }}>Saved successfully!</span>
        </div>
      )}

      {/* Step Content */}
      <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}>
        {/* Basic Info Step */}
        {PROFILE_STEPS[currentStep].id === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Basic Information</h2>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Headline *
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                placeholder="e.g., Senior React Developer & Startup Advisor"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {formData.headline.length}/100 characters
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Biography *
              </label>
              <textarea
                maxLength={1000}
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell clients about your expertise, experience, and what makes you unique..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  minHeight: '120px',
                  resize: 'vertical',
                }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {formData.bio.length}/1000 characters
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select category</option>
                  <option value="Technology">Technology</option>
                  <option value="Business">Business</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Design">Design</option>
                  <option value="Finance">Finance</option>
                  <option value="Health">Health & Wellness</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Languages *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={languageInput}
                    onChange={(e) => setLanguageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
                    placeholder="Add language"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={addLanguage}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: accentColor,
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {formData.languages.map(lang => (
                    <span
                      key={lang}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        backgroundColor: 'var(--surface-input)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      {lang}
                      <button
                        onClick={() => removeLanguage(lang)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0',
                          display: 'flex',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Skills *
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  placeholder="Add a skill"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={addSkill}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: accentColor,
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {formData.skills.map(skill => (
                  <span
                    key={skill}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: accentColor + '18',
                      color: accentColor,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                        display: 'flex',
                        color: accentColor,
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Specialties
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                  placeholder="Add a specialty"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={addSpecialty}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: accentColor,
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {formData.specialties.map(spec => (
                  <span
                    key={spec}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: 'var(--surface-input)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {spec}
                    <button
                      onClick={() => removeSpecialty(spec)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                        display: 'flex',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Professional Step */}
        {PROFILE_STEPS[currentStep].id === 'professional' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Professional Credentials</h2>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Experience
              </label>
              <textarea
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                placeholder="Describe your professional experience..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  minHeight: '100px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Education
              </label>
              <textarea
                value={formData.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                placeholder="List your educational background and certifications..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  minHeight: '100px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Documents & Certifications
              </label>
              <div
                style={{
                  padding: '20px',
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Upload size={24} style={{ margin: '0 auto 8px', color: accentColor }} />
                <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Click to upload documents
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                  PDF, DOC, or images (Max 10 MB each)
                </p>
              </div>
              {formData.documents.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {formData.documents.map((doc, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        backgroundColor: 'var(--surface-input)',
                        borderRadius: '6px',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{doc.name}</span>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            documents: prev.documents.filter((_, i) => i !== idx),
                          }));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Availability Step */}
        {PROFILE_STEPS[currentStep].id === 'availability' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Availability Settings</h2>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Buffer Time (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={formData.bufferMinutes}
                  onChange={(e) => handleInputChange('bufferMinutes', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Time between sessions</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Min Notice (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={formData.minNoticeHours}
                  onChange={(e) => handleInputChange('minNoticeHours', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Minimum advance booking</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Max Advance (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.maxAdvanceDays}
                  onChange={(e) => handleInputChange('maxAdvanceDays', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>How far ahead to book</p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Weekly Schedule
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {DAYS.map(day => (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: 'var(--surface-input)', borderRadius: '6px' }}>
                    <label style={{ width: '90px', fontSize: '12px', fontWeight: '600', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.weeklySchedule[day].available}
                        onChange={(e) => handleScheduleChange(day, 'available', e.target.checked)}
                        style={{ marginRight: '6px' }}
                      />
                      {day}
                    </label>

                    {formData.weeklySchedule[day].available && (
                      <>
                        <input
                          type="time"
                          value={formData.weeklySchedule[day].start}
                          onChange={(e) => handleScheduleChange(day, 'start', e.target.value)}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'inherit',
                          }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
                        <input
                          type="time"
                          value={formData.weeklySchedule[day].end}
                          onChange={(e) => handleScheduleChange(day, 'end', e.target.value)}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'inherit',
                          }}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Step */}
        {PROFILE_STEPS[currentStep].id === 'pricing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Pricing & Visibility</h2>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Hourly Rate ($) *
              </label>
              <input
                type="number"
                min="10"
                max="9999"
                step="5"
                value={formData.hourlyRate}
                onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                placeholder="e.g., 100"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                This is your rate for consultation sessions
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  checked={formData.profilePublic}
                  onChange={(e) => handleInputChange('profilePublic', e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Make my profile public
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  checked={formData.acceptingBookings}
                  onChange={(e) => handleInputChange('acceptingBookings', e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                I'm accepting new bookings
              </label>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: accentColor + '08',
              border: `1px solid ${accentColor}22`,
              borderRadius: '8px',
            }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                💡 <strong>Tip:</strong> Set a competitive hourly rate based on your experience and market research. You can adjust this anytime from your dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Review Step */}
        {PROFILE_STEPS[currentStep].id === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Review Your Profile</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', margin: '0 0 8px 0' }}>
                  Basic Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Headline:</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-primary)' }}>{formData.headline}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Category:</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-primary)' }}>{formData.category}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Skills:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {formData.skills.map(skill => (
                        <span key={skill} style={{ padding: '2px 8px', backgroundColor: accentColor + '18', color: accentColor, borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', margin: '0 0 8px 0' }}>
                  Pricing & Availability
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Hourly Rate:</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>${formData.hourlyRate}/hour</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Timezone:</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-primary)' }}>{formData.timezone}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Status:</span>
                    <p style={{ margin: '2px 0 0', color: formData.acceptingBookings ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      {formData.acceptingBookings ? '✓ Accepting Bookings' : '✗ Not Accepting'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              display: 'flex',
              gap: '12px',
            }}>
              <AlertCircle size={18} color="#b45309" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: '#78350f', margin: 0, lineHeight: '1.5' }}>
                After completing your profile, you'll need to submit it for admin review before appearing on the marketplace. This typically takes 1-2 business days.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            opacity: currentStep === 0 ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          <ChevronLeft size={14} />
          Previous
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          {currentStep === PROFILE_STEPS.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: accentColor,
                color: '#fff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              <CheckCircle size={14} />
              {saving ? 'Completing...' : 'Complete Profile'}
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: accentColor + '22',
                  color: accentColor,
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save & Continue'}
              </button>

              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Skip
                <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
