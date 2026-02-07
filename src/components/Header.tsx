import { useState, useEffect } from 'react';
import type { BuildingConfig } from '../types';

export default function Header({ config }: { config: BuildingConfig | null }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="header-row" style={styles.header}>
      <div style={styles.left}>
        <div style={styles.buildingNumber}>{config?.buildingNumber || '77'}</div>
        <a href="/admin" style={{ textDecoration: 'none' }}>
          <h1 style={styles.title}>{config?.buildingName || 'Building Services Status'}</h1>
          <p style={styles.subtitle}>{config?.subtitle || 'Real-time System Monitor'}</p>
        </a>
      </div>
      <div style={styles.right}>
        <div style={styles.time}>{formatTime(time)}</div>
        <div style={styles.date}>{formatDate(time)}</div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: 'linear-gradient(135deg, #1a5c5a 0%, #0f3d3b 100%)',
    padding: '14px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: { display: 'flex', alignItems: 'center', gap: '16px' },
  buildingNumber: {
    background: 'rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '6px 14px',
    fontSize: '24px',
    fontWeight: 700,
    color: '#fff',
  },
  title: { fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 },
  subtitle: { fontSize: '13px', color: '#4dd0c8', margin: 0 },
  right: { textAlign: 'right' as const },
  time: { fontSize: '22px', fontWeight: 700, color: '#fff' },
  date: { fontSize: '13px', color: 'rgba(255,255,255,0.65)' },
};
