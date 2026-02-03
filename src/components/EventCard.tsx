import type { Event } from '../types';

export default function EventCard({ event }: { event: Event }) {
  const hasImage = !!event.imageUrl;

  return (
    <div style={{
      ...styles.card,
      backgroundImage: hasImage ? `linear-gradient(rgba(10,22,40,0.7), rgba(10,22,40,0.85)), url(${event.imageUrl})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      borderLeft: event.accentColor ? `4px solid ${event.accentColor}` : '4px solid #00bcd4',
    }}>
      <h3 style={styles.title}>{event.title}</h3>
      {event.subtitle && <p style={styles.subtitle}>{event.subtitle}</p>}
      {event.details.length > 0 && (
        <ul style={styles.list}>
          {event.details.map((d, i) => (
            <li key={i} style={styles.listItem}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#132038',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #1a3050',
  },
  title: { fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 4px' },
  subtitle: { fontSize: '13px', color: '#00bcd4', margin: '0 0 12px' },
  list: { paddingLeft: '18px', margin: 0 },
  listItem: { fontSize: '13px', color: '#ccc', marginBottom: '4px' },
};
