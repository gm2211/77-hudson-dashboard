import type { Service } from '../types';
import { STATUS_COLORS } from '../constants';

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff === 1) return '1 min ago';
  return `${diff} mins ago`;
}

export default function ServiceTable({ services }: { services: Service[] }) {
  const hasAnyNotes = services.some(s => s.notes);

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Service</th>
            <th style={styles.th}>Status</th>
            {hasAnyNotes && <th style={styles.th}>Notes</th>}
            <th style={{ ...styles.th, textAlign: 'right' }}>Last Checked</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id}>
              <td style={styles.td}>{s.name}</td>
              <td style={styles.td}>
                <span style={styles.statusCell}>
                  <span style={{ ...styles.dot, background: STATUS_COLORS[s.status] || '#888' }} />
                  {s.status}
                </span>
              </td>
              {hasAnyNotes && (
                <td style={{ ...styles.td, color: '#666', fontStyle: 'italic', fontSize: '14px' }}>
                  {s.notes || '—'}
                </td>
              )}
              <td style={{ ...styles.td, textAlign: 'right', color: '#888' }}>
                {timeAgo(s.lastChecked)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e0d8d0',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    fontSize: '13px',
    color: '#555',
    fontWeight: 600,
    padding: '12px 24px',
    textAlign: 'left',
    borderBottom: '1px solid #e0d8d0',
    background: '#faf8f5',
  },
  td: {
    padding: '12px 24px',
    fontSize: '15px',
    color: '#333',
    borderBottom: '1px solid #eee',
  },
  statusCell: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
};
