import { useRouter } from 'next/router';
import React from 'react';

const buttonBase: React.CSSProperties = {
  width: 54,
  height: 54,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.92)',
  color: '#1976d2',
  border: '1px solid #e3e6ea',
  boxShadow: '0 2px 12px rgba(25, 118, 210, 0.08)',
  cursor: 'pointer',
  transition: 'box-shadow 0.18s, background 0.18s, color 0.18s, border 0.18s',
  fontSize: 22,
  outline: 'none',
};

const buttonHover: React.CSSProperties = {
  background: '#1976d2',
  color: '#fff',
  border: '1px solid #1976d2',
  boxShadow: '0 6px 24px rgba(25, 118, 210, 0.16)',
};

const FloatingButtons = () => {
  const router = useRouter();
  const [hovered, setHovered] = React.useState<string | null>(null);

  return (
    <div style={{
      position: 'fixed',
      left: 28,
      top: '42%',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      zIndex: 2000,
      pointerEvents: 'none'
    }}>
      <button
        style={{
          ...buttonBase,
          ...(hovered === 'dashboard' ? buttonHover : {}),
          pointerEvents: 'auto'
        }}
        onMouseEnter={() => setHovered('dashboard')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => router.push('/dashboard')}
        aria-label="Dashboard"
        title="Dashboard"
      >
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4H9v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        style={{
          ...buttonBase,
          ...(hovered === 'plannings' ? buttonHover : {}),
          pointerEvents: 'auto'
        }}
        onMouseEnter={() => setHovered('plannings')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => router.push('/plannings')}
        aria-label="Plannings"
        title="Plannings"
      >
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 3v4M8 3v4M3 9h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};

export default FloatingButtons;
