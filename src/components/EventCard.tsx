import type { Event } from '../types';
import { parseMarkdown } from '../utils/markdown';

export default function EventCard({ event }: { event: Event }) {
  const detailsMarkdown = event.details.join('\n');
  const renderedDetails = parseMarkdown(detailsMarkdown);

  return (
    <div style={{
      ...styles.card,
      background: event.imageUrl
        ? `linear-gradient(to right, rgba(20,60,58,0.92) 0%, rgba(20,60,58,0.75) 50%, rgba(20,60,58,0.3) 100%), url(${event.imageUrl})`
        : 'linear-gradient(135deg, #1a5c5a 0%, #1a4a48 100%)',
      backgroundSize: event.imageUrl ? '100% 100%, cover' : undefined,
      backgroundPosition: event.imageUrl ? 'center, center' : undefined,
      backgroundRepeat: 'no-repeat',
    }}>
      <div style={styles.content}>
        <h3 style={styles.title}>{event.title}</h3>
        {event.subtitle && <p style={styles.subtitle}>{event.subtitle}</p>}
        {detailsMarkdown.trim() && (
          <div
            style={{ fontSize: '14px', color: '#e0e0e0', lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: renderedDetails }}
          />
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
  accentBar: { height: '4px', width: '100%' },
};
