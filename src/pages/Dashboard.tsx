import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
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

  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';

  const fetchAll = useCallback(() => {
    if (isPreview) {
      fetch('/api/services').then(r => r.json()).then(setServices);
      fetch('/api/events').then(r => r.json()).then(setEvents);
      fetch('/api/advisories').then(r => r.json()).then(setAdvisories);
      fetch('/api/config').then(r => r.json()).then(setConfig);
    } else {
      fetch('/api/published').then(r => r.json()).then(data => {
        setServices(data.services || []);
        setEvents(data.events || []);
        setAdvisories(data.advisories || []);
        setConfig(data.config || null);
      });
    }
  }, [isPreview]);

  useEffect(() => {
    fetchAll();

    const es = new EventSource('/api/events-stream');
    es.onmessage = () => fetchAll();
    return () => es.close();
  }, [fetchAll]);

  const scrollSpeed = config?.scrollSpeed ?? 30;
  const tickerSpeed = config?.tickerSpeed ?? 25;

  return (
    <div style={styles.page}>
      <Header config={config} />
      <div style={styles.body}>
        <ServiceTable services={services} />
        <AutoScrollCards events={events} scrollSpeed={scrollSpeed} />
      </div>
      <AdvisoryTicker advisories={advisories} tickerSpeed={tickerSpeed} />
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
  const isDoubledRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const check = () => {
      // When currently doubled, estimate single-content height as half
      const measuredHeight = inner.scrollHeight;
      const singleHeight = isDoubledRef.current ? measuredHeight / 2 : measuredHeight;
      const needs = singleHeight > container.clientHeight;
      setNeedsScroll(needs);
    };
    check();
    const obs = new ResizeObserver(check);
    obs.observe(container);
    obs.observe(inner);
    return () => obs.disconnect();
  }, [events]);

  // Use layout effect to reset scroll before paint (prevents visual flash)
  useLayoutEffect(() => {
    if (!needsScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    isDoubledRef.current = needsScroll;
  }, [needsScroll]);

  useEffect(() => {
    if (!needsScroll || scrollSpeed === 0) return;
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    let lastTime: number | null = null;
    const pxPerMs = scrollSpeed / 1000;

    const step = (time: number) => {
      if (lastTime !== null) {
        const dt = time - lastTime;
        container.scrollTop += pxPerMs * dt;

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
