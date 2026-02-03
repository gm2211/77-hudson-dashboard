import { useState, useEffect, useCallback, useRef } from 'react';
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

  const hasAdvisory = advisories.some(a => a.active);
  const scrollSpeed = config?.scrollSpeed ?? 30;

  return (
    <div style={styles.page}>
      <Header config={config} />
      <div style={styles.body}>
        <ServiceTable services={services} />
        <AutoScrollCards events={events} scrollSpeed={scrollSpeed} />
      </div>
      <AdvisoryTicker advisories={advisories} />
      <style>{`
        html, body { overflow: hidden; height: 100%; }
        #root { height: 100%; }
      `}</style>
    </div>
  );
}

function AutoScrollCards({ events, scrollSpeed }: { events: Event[]; scrollSpeed: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const check = () => {
      setNeedsScroll(inner.scrollHeight > container.clientHeight);
    };
    check();
    const obs = new ResizeObserver(check);
    obs.observe(container);
    obs.observe(inner);
    return () => obs.disconnect();
  }, [events]);

  useEffect(() => {
    if (!needsScroll || scrollSpeed === 0) return;
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    let lastTime: number | null = null;
    // scrollSpeed is pixels per second
    const pxPerMs = scrollSpeed / 1000;

    const step = (time: number) => {
      if (lastTime !== null) {
        const dt = time - lastTime;
        container.scrollTop += pxPerMs * dt;

        // When we've scrolled past the first set, jump back to create seamless loop
        const halfScroll = container.scrollHeight / 2;
        if (container.scrollTop >= halfScroll) {
          container.scrollTop -= halfScroll;
        }
      }
      lastTime = time;
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [needsScroll, scrollSpeed]);

  // When scrolling, duplicate cards for seamless loop
  const displayEvents = needsScroll ? [...events, ...events] : events;

  return (
    <div ref={containerRef} style={styles.cards}>
      <div ref={innerRef} style={styles.cardsInner}>
        {displayEvents.map((e, i) => <EventCard key={`${e.id}-${i}`} event={e} />)}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    padding: '20px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'hidden',
  },
  cards: {
    flex: 1,
    overflow: 'hidden',
  },
  cardsInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
};
