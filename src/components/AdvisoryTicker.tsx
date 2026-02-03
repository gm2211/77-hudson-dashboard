import type { Advisory } from '../types';

export default function AdvisoryTicker({ advisories }: { advisories: Advisory[] }) {
  const active = advisories.filter(a => a.active);
  if (active.length === 0) return null;

  const text = active.map(a => `${a.label}: ${a.message}`).join('   •   ');

  return (
    <div style={styles.ticker}>
      <div style={styles.scrollWrap}>
        <span style={styles.scrollText}>{text}&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;{text}</span>
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
    background: '#ffc107',
    padding: '10px 0',
    overflow: 'hidden',
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  scrollWrap: {
    display: 'inline-block',
    whiteSpace: 'nowrap',
    animation: 'ticker-scroll 30s linear infinite',
  },
  scrollText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
  },
};
