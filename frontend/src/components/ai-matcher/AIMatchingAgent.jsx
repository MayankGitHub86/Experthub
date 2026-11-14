import React, { useState } from 'react';
import { Sparkles, ArrowRight, Bot, Star, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { mockExperts } from '../../data/mockExperts';

export default function AIMatchingAgent({ onBookExpert, onStartChat }) {
  const [promptInput, setPromptInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedResults, setMatchedResults] = useState(null);

  const samplePrompts = [
    "We need an architect to review our multi-agent LLM pipeline and vector search latency.",
    "Looking for a design systems lead to help unify our React 19 web tokens with Figma.",
    "Need an AWS & Kubernetes specialist to help audit our $40k/mo cloud spend.",
    "Looking for a security auditor for an Ethereum smart contract launch next week."
  ];

  const handleMatch = (text) => {
    const query = text || promptInput;
    if (!query.trim()) return;

    setIsAnalyzing(true);
    setMatchedResults(null);

    fetch('http://localhost:3001/api/ai/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: query })
    })
      .then((res) => res.json())
      .then((data) => {
        setIsAnalyzing(false);
        if (data.topMatches && data.topMatches.length > 0) {
          // Rehydrate with full mock profile objects
          const enriched = data.topMatches.map((m) => {
            const fullExpert = mockExperts.find(e => e.id === m.expertId) || mockExperts[0];
            return {
              expert: fullExpert,
              matchScore: m.matchScore,
              reasons: m.reasons
            };
          });
          setMatchedResults(enriched);
        }
      })
      .catch((err) => {
        console.log('[AI Matcher] Backend fetch failed, falling back to local heuristic:', err);
        // Fallback to local heuristic
        setTimeout(() => {
          setIsAnalyzing(false);
          const lower = query.toLowerCase();
          const ranked = mockExperts.map((exp) => {
            let score = 70;
            let reasons = [];
            exp.tags.forEach(t => {
              if (lower.includes(t.toLowerCase())) {
                score += 8;
                reasons.push(`Direct skill match: "${t}"`);
              }
            });
            if (lower.includes('ai') || lower.includes('llm') || lower.includes('agent') || lower.includes('vector')) {
              if (exp.category === 'AI & Machine Learning') {
                score += 18;
                reasons.push("Specialized deep-learning background matches query domain");
              }
            }
            if (lower.includes('design') || lower.includes('figma') || lower.includes('token') || lower.includes('ux')) {
              if (exp.category === 'Design & UX') {
                score += 18;
                reasons.push("Extensive enterprise design systems experience");
              }
            }
            if (lower.includes('cloud') || lower.includes('kubernetes') || lower.includes('aws') || lower.includes('cost')) {
              if (exp.category === 'Cloud & DevOps') {
                score += 18;
                reasons.push("Proven track record in infrastructure and cost optimization");
              }
            }
            if (lower.includes('contract') || lower.includes('audit') || lower.includes('security') || lower.includes('crypto')) {
              if (exp.category === 'Security & Blockchain') {
                score += 18;
                reasons.push("Specialized formal verification & auditing background");
              }
            }
            const clampedScore = Math.min(Math.max(score, 72), 99);
            return {
              expert: exp,
              matchScore: clampedScore,
              reasons: reasons.length ? reasons : ["General senior advisory fit based on platform track record"]
            };
          }).sort((a, b) => b.matchScore - a.matchScore);
          setMatchedResults(ranked.slice(0, 3));
        }, 500);
      });
  };

  return (
    <div className="ai-matcher-container">
      {/* Hero Header */}
      <div 
        className="ai-matcher-hero-card"
        style={{
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '28px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            flexShrink: 0
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', margin: 0 }}>
              ExpertMatcher AI Assistant
            </h2>
            <p style={{ fontSize: '13.5px', marginTop: '4px', margin: 0, lineHeight: 1.5 }}>
              Powered by OpenAI embeddings. Describe your problem in plain English and let AI match you with the exact right vetted specialist.
            </p>
          </div>
        </div>

        {/* Input Box */}
        <div style={{ position: 'relative', marginTop: '16px' }}>
          <textarea
            rows={3}
            className="ai-matcher-textarea"
            placeholder="e.g. We are building a fintech app and need someone who understands high-throughput transaction pipelines and regulatory compliance..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
          />
          <button
            onClick={() => handleMatch()}
            disabled={isAnalyzing}
            className="btn-pro"
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              width: 'auto',
              padding: '9px 18px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600'
            }}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Analyzing Needs...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Find Matches</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '700', 
            color: 'var(--text-secondary)', 
            marginBottom: '10px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.6px' 
          }}>
            TRY AN EXAMPLE PROMPT:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '10px' }}>
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPromptInput(p);
                  handleMatch(p);
                }}
                className="ai-prompt-chip"
              >
                <Sparkles size={14} color="#6366f1" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  "{p}"
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Matched Results Display */}
      {matchedResults && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Top AI Matches ({matchedResults.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: '600' }}>
              ✓ High confidence match found
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {matchedResults.map(({ expert, matchScore, reasons }, idx) => (
              <div
                key={expert.id}
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: idx === 0 ? '1.5px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: idx === 0 ? '0 0 20px rgba(139, 92, 246, 0.2)' : 'var(--shadow-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '14px' }}>
                    <img 
                      src={expert.avatar} 
                      alt={expert.name} 
                      style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {expert.name}
                        </h4>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: idx === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                          color: idx === 0 ? '#34d399' : '#c084fc'
                        }}>
                          {matchScore}% Match
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--accent-purple-light)', fontWeight: '500' }}>
                        {expert.role}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {expert.company}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      ${expert.hourlyRate}/hr
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#fbbf24', fontSize: '12px', justifyContent: 'flex-end' }}>
                      <Star size={13} fill="#fbbf24" stroke="#fbbf24" />
                      <span>{expert.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Match Reasoning Pill */}
                <div style={{
                  backgroundColor: 'var(--surface-input)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginBottom: '14px',
                  borderLeft: '3px solid var(--accent-purple)'
                }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Why this match: </strong>
                  {reasons.join('; ')}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    onClick={() => onStartChat(expert)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--surface-input)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      fontWeight: '500'
                    }}
                  >
                    Quick Chat Inquiry
                  </button>
                  <button
                    onClick={() => onBookExpert(expert)}
                    className="btn-pro"
                    style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}
                  >
                    <span>Book Session Now</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
