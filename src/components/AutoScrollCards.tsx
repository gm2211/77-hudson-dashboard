import { useState, useEffect, useRef } from 'react';
import EventCard from './EventCard';
import type { Event } from '../types';

// Temporary debug logger — sends to backend so we can see in Render logs
const _loggedOnce = new Set<string>();
function debugLog(message: string, data?: Record<string, unknown>) {
  const key = message + JSON.stringify(data);
  if (_loggedOnce.has(key)) return;
  _loggedOnce.add(key);
  console.log('[AutoScroll]', message, data);
  fetch('/api/client-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 'debug', message: `[AutoScroll] ${message}`, data }),
  }).catch(() => {});
}

/**
 * Auto-scrolling event cards with seamless loop.
 *
 * IMPORTANT SCROLLING NOTES (don't break this again!):
 * 1. Container needs position:absolute with inset:0 inside a position:relative wrapper
 *    to get a definite height for overflow:auto to work in flexbox
 * 2. Must accumulate fractional pixels and only scroll when >= 1px,
 *    because browsers ignore sub-pixel scrollTop values
 * 3. Use direct scrollTop assignment — scrollBy() is broken in Safari
 *    when scrollbar pseudo-elements are styled
 * 4. Do NOT hide scrollbars globally with `*::-webkit-scrollbar` — Safari
 *    silently breaks programmatic scrolling when scrollbar pseudo-elements
 *    are hidden. Hide scrollbars only on the specific container via inline style.
 */
export default function AutoScrollCards({ events, scrollSpeed }: { events: Event[]; scrollSpeed: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const singleRef = useRef<HTMLDivElement>(null);
  const dupRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  const shouldScroll = events.length > 0 && scrollSpeed > 0;
  const isDoubled = shouldScroll && needsScroll;

  debugLog('render', { eventCount: events.length, scrollSpeed, shouldScroll, needsScroll, isDoubled });

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
      const contentH = singleContent.offsetHeight;
      const containerH = container.clientHeight;
      const overflows = contentH > containerH;
      debugLog('overflow-check', { contentH, containerH, overflows });
      setNeedsScroll(overflows);
    };
    checkOverflow();
    // Recheck on resize / zoom
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldScroll, events.length]);

  // Log animation state once when it starts
  const loggedAnimStart = useRef(false);
  const loggedScrollBy = useRef(false);

  // Run the scroll animation
  useEffect(() => {
    loggedAnimStart.current = false;
    loggedScrollBy.current = false;
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

        if (!loggedAnimStart.current) {
          loggedAnimStart.current = true;
          debugLog('animation: running', {
            contentHeight, maxScrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            scrollTop: container.scrollTop,
            overflowY: getComputedStyle(container).overflowY,
          });
        }

        if (maxScrollTop > 0) {
          const pxPerMs = contentHeight / (scrollSpeed * 1000);
          accumulatedScroll += pxPerMs * dt;

          if (accumulatedScroll >= 1) {
            const scrollAmount = Math.floor(accumulatedScroll);
            const before = container.scrollTop;
            container.scrollTop = before + scrollAmount;
            if (!loggedScrollBy.current) {
              loggedScrollBy.current = true;
              debugLog('scrollTop assign', {
                scrollAmount, before, after: container.scrollTop,
                didMove: container.scrollTop !== before,
              });
            }
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
    <div className="auto-scroll-wrapper" style={styles.cardsWrapper}>
      <div ref={containerRef} className="auto-scroll-container" style={styles.cards}>
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
