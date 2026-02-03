import { useState, useEffect, useRef } from 'react';
import type { Advisory } from '../types';

export default function AdvisoryTicker({ advisories, tickerSpeed = 25 }: { advisories: Advisory[]; tickerSpeed?: number }) {
  const active = advisories.filter(a => a.active);
  const [shouldScroll, setShouldScroll] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if content overflows or there's more than one advisory
    if (active.length > 1) {
      setShouldScroll(true);
    } else if (contentRef.current && containerRef.current) {
      const contentWidth = contentRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      setShouldScroll(contentWidth > containerWidth);
    } else {
      setShouldScroll(false);
    }
  }, [active]);

  if (active.length === 0) return null;

  const labels = active.map(a => (
    <span key={a.id} style={styles.segment}>
      <span style={styles.label}>{a.label}</span>
      <span style={styles.message}>{a.message}</span>
    </span>
  ));

  const duration = tickerSpeed > 0 && shouldScroll ? `${tickerSpeed}s` : '0s';
  const animationStyle = tickerSpeed > 0 && shouldScroll
    ? { animation: `ticker-scroll ${duration} linear infinite` }
    : { animation: 'none' };

  return (
    <div style={styles.ticker} ref={containerRef}>
      <div style={styles.track}>
        <div ref={contentRef} style={{ ...styles.scroll, ...animationStyle, justifyContent: shouldScroll ? 'flex-start' : 'center' }}>
          {labels}
          {shouldScroll && labels}
        </div>
      </div>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  ticker: {
    background: '#f5c842',
    flexShrink: 0,
    overflow: 'hidden',
  },
  track: {
    overflow: 'hidden',
    padding: '12px 0',
  },
  scroll: {
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  segment: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '16px',
    marginRight: '60px',
  },
  label: {
    background: '#c0392b',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
    padding: '5px 14px',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
    letterSpacing: '0.5px',
  },
  message: {
    fontSize: '18px',
    fontWeight: 500,
    color: '#222',
    whiteSpace: 'nowrap',
  },
};
