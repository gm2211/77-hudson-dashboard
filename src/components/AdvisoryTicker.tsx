import type { Advisory } from '../types';

export default function AdvisoryTicker({ advisories }: { advisories: Advisory[] }) {
  const active = advisories.filter(a => a.active);
  if (active.length === 0) return null;

  const labels = active.map(a => (
    <span key={a.id} style={styles.segment}>
      <span style={styles.label}>{a.label}</span>
      <span style={styles.message}>{a.message}</span>
    </span>
  ));

  return (
    <div style={styles.ticker}>
      <div style={styles.track}>
        <div style={styles.scroll}>
          {labels}
          {labels}
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
    animation: 'ticker-scroll 25s linear infinite',
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
