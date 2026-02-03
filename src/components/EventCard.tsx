import type { Event } from '../types';

export default function EventCard({ event }: { event: Event }) {
  return (
    <div style={{
      ...styles.card,
      backgroundImage: event.imageUrl
        ? `linear-gradient(to right, rgba(20,60,58,0.92) 0%, rgba(20,60,58,0.75) 50%, rgba(20,60,58,0.3) 100%), url(${event.imageUrl})`
        : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div style={styles.content}>
        <h3 style={styles.title}>{event.title}</h3>
        {event.subtitle && <p style={styles.subtitle}>{event.subtitle}</p>}
        {event.details.length > 0 && (
          <ul style={styles.list}>
            {event.details.map((d, i) => (
              <li key={i} style={styles.listItem}>
                <span style={styles.bullet}>●</span>
                {d}
              </li>
            ))}
          </ul>
        )}
      </div>
      {event.accentColor && <div style={{ ...styles.accentBar, background: event.accentColor }} />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'linear-gradient(135deg, #1a5c5a 0%, #1a4a48 100%)',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  content: {
    padding: '24px 28px',
  },
  title: { fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 4px' },
  subtitle: { fontSize: '14px', color: '#b0d4d0', margin: '0 0 14px', fontStyle: 'italic' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: { fontSize: '14px', color: '#e0e0e0', marginBottom: '4px', display: 'flex', alignItems: 'baseline', gap: '8px' },
  bullet: { color: '#e0e0e0', fontSize: '8px', flexShrink: 0 },
  accentBar: { height: '4px', width: '100%' },
};
