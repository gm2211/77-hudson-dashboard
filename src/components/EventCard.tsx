import type { Event } from '../types';

function parseMarkdown(md: string): string {
  const lines = md.split('\n');
  const result: string[] = [];
  let inBulletList = false;
  let inNumberedList = false;
  let listCounter = 0;

  const bulletStyle = 'list-style:none;padding:0;margin:8px 0';
  const olStyle = 'list-style:none;padding:0;margin:8px 0;counter-reset:item';
  const bulletLiStyle = 'display:flex;align-items:baseline;gap:8px;margin-bottom:4px';
  const olLiStyle = 'display:flex;align-items:baseline;gap:8px;margin-bottom:4px;counter-increment:item';

  for (const line of lines) {
    let processed = line;

    const bulletMatch = processed.match(/^[-*]\s+(.*)$/);
    const numberedMatch = processed.match(/^\d+\.\s+(.*)$/);

    if (bulletMatch) {
      if (!inBulletList) {
        if (inNumberedList) { result.push('</ol>'); inNumberedList = false; }
        result.push(`<ul style="${bulletStyle}">`);
        inBulletList = true;
      }
      processed = `<li style="${bulletLiStyle}"><span style="color:#e0e0e0;font-size:8px;flex-shrink:0">●</span><span>${bulletMatch[1]}</span></li>`;
    } else if (numberedMatch) {
      if (!inNumberedList) {
        if (inBulletList) { result.push('</ul>'); inBulletList = false; }
        result.push(`<ol style="${olStyle}">`);
        inNumberedList = true;
        listCounter = 0;
      }
      listCounter++;
      processed = `<li style="${olLiStyle}"><span style="color:#e0e0e0;font-size:12px;flex-shrink:0;min-width:16px">${listCounter}.</span><span>${numberedMatch[1]}</span></li>`;
    } else {
      if (inBulletList) { result.push('</ul>'); inBulletList = false; }
      if (inNumberedList) { result.push('</ol>'); inNumberedList = false; listCounter = 0; }

      if (processed.match(/^### (.+)$/)) {
        processed = processed.replace(/^### (.+)$/, '<h3 style="margin:8px 0 4px;font-size:14px">$1</h3>');
      } else if (processed.match(/^## (.+)$/)) {
        processed = processed.replace(/^## (.+)$/, '<h2 style="margin:8px 0 4px;font-size:16px">$1</h2>');
      } else if (processed.match(/^# (.+)$/)) {
        processed = processed.replace(/^# (.+)$/, '<h1 style="margin:8px 0 4px;font-size:18px">$1</h1>');
      } else if (processed.trim() === '') {
        processed = '<br/>';
      } else {
        processed = processed + '<br/>';
      }
    }

    processed = processed
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`(.+?)`/g, '<code style="background:#1a3050;padding:2px 4px;border-radius:3px">$1</code>');

    result.push(processed);
  }

  if (inBulletList) result.push('</ul>');
  if (inNumberedList) result.push('</ol>');

  return result.join('');
}

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
