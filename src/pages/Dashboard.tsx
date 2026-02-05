import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import ServiceTable from '../components/ServiceTable';
import EventCard from '../components/EventCard';
import AdvisoryTicker from '../components/AdvisoryTicker';
import { DEFAULTS } from '../constants';
import type { Service, Event, Advisory, BuildingConfig } from '../types';

export default function Dashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [config, setConfig] = useState<BuildingConfig | null>(null);

  const params = new URLSearchParams(window.location.search);
  const isPreview = params.get('preview') === 'true';
  const snapshotVersion = params.get('snapshot');

  const fetchAll = useCallback(() => {
    if (isPreview) {
      fetch('/api/services').then(r => r.json()).then(setServices);
      fetch('/api/events').then(r => r.json()).then(setEvents);
      fetch('/api/advisories').then(r => r.json()).then(setAdvisories);
      fetch('/api/config').then(r => r.json()).then(setConfig);
    } else if (snapshotVersion) {
      // Load a specific snapshot version (for preview in history)
      fetch(`/api/snapshots/${snapshotVersion}`).then(r => r.json()).then(data => {
        setServices(data.services || []);
        setEvents(data.events || []);
        setAdvisories(data.advisories || []);
        setConfig(data.config || null);
      });
    } else {
      fetch('/api/snapshots/latest').then(r => r.json()).then(data => {
        setServices(data.services || []);
        setEvents(data.events || []);
        setAdvisories(data.advisories || []);
        setConfig(data.config || null);
      });
    }
  }, [isPreview, snapshotVersion]);

  useEffect(() => {
    fetchAll();

    const es = new EventSource('/api/events-stream');
    es.onmessage = () => fetchAll();
    return () => es.close();
  }, [fetchAll]);

  const scrollSpeed = config?.scrollSpeed ?? DEFAULTS.SCROLL_SPEED;
  const tickerSpeed = config?.tickerSpeed ?? DEFAULTS.TICKER_SPEED;
  const servicesScrollSpeed = config?.servicesScrollSpeed ?? DEFAULTS.SERVICES_SCROLL_SPEED;

  return (
    <div style={styles.page}>
      <Header config={config} />
      <div style={styles.body}>
        <ServiceTable services={services} scrollSpeed={servicesScrollSpeed} />
        <AutoScrollCards events={events} scrollSpeed={scrollSpeed} />
      </div>
      <AdvisoryTicker advisories={advisories} tickerSpeed={tickerSpeed} />
      <style>{`
        html, body { overflow: hidden; height: 100%; background: #fff; }
        #root { height: 100%; }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/**
 * Auto-scrolling event cards with seamless loop.
 *
 * IMPORTANT SCROLLING NOTES (don't break this again!):
 * 1. Container needs position:absolute with inset:0 inside a position:relative wrapper
 *    to get a definite height for overflow:auto to work in flexbox
 * 2. Must accumulate fractional pixels and only call scrollBy() when >= 1px,
 *    because browsers ignore sub-pixel scrollTop assignments
 * 3. Use scrollBy({ top, behavior: 'instant' }) not direct scrollTop assignment
 */
function AutoScrollCards({ events, scrollSpeed }: { events: Event[]; scrollSpeed: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const shouldScroll = events.length > 0 && scrollSpeed > 0;

  useEffect(() => {
    if (!shouldScroll) return;
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    let lastTime: number | null = null;
    let accumulatedScroll = 0;

    const step = (time: number) => {
      if (lastTime !== null) {
        const dt = time - lastTime;
        const contentHeight = container.scrollHeight / 2;
        const maxScrollTop = container.scrollHeight - container.clientHeight;

        if (maxScrollTop > 0) {
          const pxPerMs = contentHeight / (scrollSpeed * 1000);
          accumulatedScroll += pxPerMs * dt;

          if (accumulatedScroll >= 1) {
            const scrollAmount = Math.floor(accumulatedScroll);
            container.scrollBy({ top: scrollAmount, behavior: 'instant' });
            accumulatedScroll -= scrollAmount;
          }

          if (container.scrollTop >= contentHeight) {
            container.scrollTop -= contentHeight;
          }
        }
      }
      lastTime = time;
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [shouldScroll, scrollSpeed, events.length]);

  // Always duplicate cards for seamless loop when scrolling
  const displayEvents = shouldScroll ? [...events, ...events] : events;

  return (
    <div style={styles.cardsWrapper}>
      <div ref={containerRef} style={styles.cards}>
        <div style={styles.cardsInner}>
          {displayEvents.map((e, i) => <EventCard key={`${e.id}-${i}`} event={e} />)}
        </div>
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
    minHeight: 0, // Required for nested flex containers to shrink properly
    padding: '20px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'hidden',
  },
  cardsWrapper: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  cards: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'auto',
  },
  cardsInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
};
