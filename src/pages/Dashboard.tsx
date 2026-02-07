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
    // Re-fetch on reconnect so missed broadcasts are caught
    es.onopen = () => fetchAll();
    // Fallback polling in case SSE drops (e.g. background tab throttling)
    const poll = setInterval(fetchAll, 30_000);
    return () => { es.close(); clearInterval(poll); };
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
  const singleRef = useRef<HTMLDivElement>(null);
  const dupRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  const shouldScroll = events.length > 0 && scrollSpeed > 0;
  const isDoubled = shouldScroll && needsScroll;

  // Check if content overflows and we need scrolling.
  // Measures the single-content group directly — no ratio assumptions.
  useEffect(() => {
    const container = containerRef.current;
    const singleContent = singleRef.current;
    if (!container || !singleContent || !shouldScroll) {
      setNeedsScroll(false);
      return;
    }
    const checkOverflow = () => {
      setNeedsScroll(singleContent.offsetHeight > container.clientHeight);
    };
    checkOverflow();
    // Recheck on resize / zoom
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldScroll, events.length]);

  // Run the scroll animation
  useEffect(() => {
    if (!shouldScroll || !needsScroll) return;
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    let lastTime: number | null = null;
    let accumulatedScroll = 0;

    const step = (time: number) => {
      if (lastTime !== null) {
        const dt = time - lastTime;
        // Use the duplicate group's DOM offset as the wrap-around point —
        // this is the exact scroll position where the second copy begins.
        const contentHeight = dupRef.current?.offsetTop ?? container.scrollHeight / 2;
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
  }, [shouldScroll, needsScroll, scrollSpeed, events.length]);

  return (
    <div style={styles.cardsWrapper}>
      <div ref={containerRef} style={styles.cards}>
        <div style={styles.cardsInner}>
          <div ref={singleRef} style={styles.cardsGroup}>
            {events.map((e) => <EventCard key={`orig-${e.id}`} event={e} />)}
          </div>
          {isDoubled && (
            <div ref={dupRef} style={styles.cardsGroup}>
              {events.map((e) => <EventCard key={`dup-${e.id}`} event={e} />)}
            </div>
          )}
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
    padding: '14px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
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
    gap: '12px',
  },
  cardsGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};
