import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import ServiceTable from '../components/ServiceTable';
import EventCard from '../components/EventCard';
import AdvisoryTicker from '../components/AdvisoryTicker';
import type { Service, Event, Advisory, BuildingConfig } from '../types';

export default function Dashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [config, setConfig] = useState<BuildingConfig | null>(null);

  const fetchAll = useCallback(() => {
    fetch('/api/services').then(r => r.json()).then(setServices);
    fetch('/api/events').then(r => r.json()).then(setEvents);
    fetch('/api/advisories').then(r => r.json()).then(setAdvisories);
    fetch('/api/config').then(r => r.json()).then(setConfig);
  }, []);

  useEffect(() => {
    fetchAll();

    const es = new EventSource('/api/events-stream');
    es.onmessage = () => fetchAll();
    return () => es.close();
  }, [fetchAll]);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '50px' }}>
      <Header config={config} />
      <div style={styles.body}>
        <div style={styles.left}>
          <ServiceTable services={services} />
        </div>
        <div style={styles.right}>
          <h2 style={styles.heading}>Events & Announcements</h2>
          <div style={styles.cards}>
            {events.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </div>
      </div>
      <AdvisoryTicker advisories={advisories} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: { display: 'flex', gap: '24px', padding: '24px', alignItems: 'flex-start' },
  left: { flex: '0 0 55%', display: 'flex' },
  right: { flex: 1 },
  heading: { fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' },
  cards: { display: 'flex', flexDirection: 'column', gap: '16px' },
};
