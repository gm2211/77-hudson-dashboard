import type { Service } from '../types';

const statusColor: Record<string, string> = {
  Operational: '#4caf50',
  Maintenance: '#ffc107',
  Outage: '#f44336',
};

export default function ServiceTable({ services }: { services: Service[] }) {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>System Status</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Service</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Last Checked</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id} style={styles.tr}>
              <td style={styles.td}>{s.name}</td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <span style={{ ...styles.badge, background: statusColor[s.status] || '#888' }}>
                  {s.status}
                </span>
              </td>
              <td style={{ ...styles.td, textAlign: 'right', color: '#8899aa' }}>
                {new Date(s.lastChecked).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
    background: '#132038',
    borderRadius: '12px',
    border: '1px solid #1a3050',
    padding: '20px',
    flex: 1,
  },
  heading: { fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: '12px', color: '#8899aa', fontWeight: 500, padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #1a3050' },
  tr: { borderBottom: '1px solid #1a3050' },
  td: { padding: '10px 12px', fontSize: '14px', color: '#e0e0e0' },
  badge: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: '#fff' },
};
