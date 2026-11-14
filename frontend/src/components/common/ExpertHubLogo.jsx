import React from 'react';

export default function ExpertHubLogo({ size = 36, textColor = '#0F172A', showText = true, variant = 'blue' }) {
  // variant: 'blue' (as in Screenshots 1, 3, 5), 'dark' (as in Screenshot 2), 'black' (as in Screenshot 4)
  const bgGrad = variant === 'dark' 
    ? 'linear-gradient(135deg, #1e293b, #0f172a)' 
    : variant === 'black'
    ? '#0F172A'
    : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', userSelect: 'none', textDecoration: 'none' }}>
      <div 
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.28)}px`,
          background: bgGrad,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: variant === 'blue' ? '0 4px 14px rgba(37, 99, 235, 0.28)' : '0 4px 12px rgba(15, 23, 42, 0.15)',
          flexShrink: 0
        }}
      >
        <svg 
          width={Math.round(size * 0.58)} 
          height={Math.round(size * 0.58)} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stylized rounded 'E' / hexagon folded ribbon matching screenshots */}
          <path 
            d="M5 6.5C5 5.67157 5.67157 5 6.5 5H18C18.8284 5 19.5 5.67157 19.5 6.5C19.5 7.32843 18.8284 8 18 8H8.5V10.5H16.5C17.3284 10.5 18 11.1716 18 12C18 12.8284 17.3284 13.5 16.5 13.5H8.5V16H18C18.8284 16 19.5 16.6716 19.5 17.5C19.5 18.3284 18.8284 19 18 19H6.5C5.67157 19 5 18.3284 5 17.5V6.5Z" 
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {showText && (
        <span 
          style={{ 
            fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif", 
            fontSize: `${Math.round(size * 0.58)}px`, 
            fontWeight: 800, 
            letterSpacing: '-0.5px',
            color: textColor 
          }}
        >
          ExpertHub
        </span>
      )}
    </div>
  );
}
