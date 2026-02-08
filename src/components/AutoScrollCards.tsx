import { useState, useEffect, useRef } from 'react';
import EventCard from './EventCard';
import type { Event } from '../types';

/**
 * Auto-scrolling event cards with seamless loop.
 *
 * IMPORTANT SCROLLING NOTES (don't break this again!):
 * 1. Container needs position:absolute with inset:0 inside a position:relative wrapper
 *    to get a definite height for overflow:auto to work in flexbox
 * 2. Must accumulate fractional pixels and only call scrollBy() when >= 1px,
 *    because browsers ignore sub-pixel scrollTop assignments
 * 3. Use scrollBy({ top, behavior: 'instant' }) not direct scrollTop assignment
 * 4. Do NOT use `*::-webkit-scrollbar { display: none }` — Safari silently
 *    breaks scrollBy() when the scrollbar pseudo-element is display:none.
 *    Use `scrollbar-width: none` + `::-webkit-scrollbar { width: 0 }` instead.
 */
export default function AutoScrollCards({ events, scrollSpeed }: { events: Event[]; scrollSpeed: number }) {
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
