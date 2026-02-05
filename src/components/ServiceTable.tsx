import { useState, useEffect, useRef, useCallback } from 'react';
import type { Service } from '../types';
import { STATUS_COLORS, DEFAULTS } from '../constants';

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ROW_HEIGHT = 44; // pixels per row
const VISIBLE_ROWS = 6; // number of rows visible at once
const MAX_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

interface Props {
  services: Service[];
  scrollSpeed?: number; // seconds per page, 0 = no auto-scroll
}

export default function ServiceTable({ services, scrollSpeed = DEFAULTS.SERVICES_SCROLL_SPEED }: Props) {
  const hasAnyNotes = services.some(s => s.notes);
  const totalRows = services.length;
  const needsScroll = totalRows > VISIBLE_ROWS;
  const totalPages = needsScroll ? Math.ceil(totalRows / VISIBLE_ROWS) : 1;

  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Page transition effect
  const goToPage = useCallback((page: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentPage(page);
      setTimeout(() => setIsAnimating(false), 50);
    }, 300);
  }, []);

  // Auto-scroll timer
  useEffect(() => {
    if (!needsScroll || scrollSpeed <= 0) return;

    const interval = setInterval(() => {
      const nextPage = (currentPage + 1) % totalPages;
      goToPage(nextPage);
    }, scrollSpeed * 1000);

    return () => clearInterval(interval);
  }, [needsScroll, scrollSpeed, currentPage, totalPages, goToPage]);

  // Get services for current page
  const startIdx = currentPage * VISIBLE_ROWS;
  const visibleServices = services.slice(startIdx, startIdx + VISIBLE_ROWS);

  // Pad with empty rows if needed to maintain consistent height
  const paddedServices = [...visibleServices];
  while (paddedServices.length < VISIBLE_ROWS && needsScroll) {
    paddedServices.push(null as unknown as Service);
  }

  return (
    <div style={styles.container}>
      <div
        ref={containerRef}
        style={{
          ...styles.tableWrapper,
          maxHeight: needsScroll ? MAX_HEIGHT + 40 : undefined, // +40 for header
          opacity: isAnimating ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
      >
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
            {paddedServices.map((s, idx) => (
              s ? (
                <tr key={s.id} style={{ height: ROW_HEIGHT }}>
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
              ) : (
                <tr key={`empty-${idx}`} style={{ height: ROW_HEIGHT }}>
                  <td style={styles.td}>&nbsp;</td>
                  <td style={styles.td}>&nbsp;</td>
                  {hasAnyNotes && <td style={styles.td}>&nbsp;</td>}
                  <td style={styles.td}>&nbsp;</td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {/* Page indicator (airport-style) */}
      {needsScroll && totalPages > 1 && (
        <div style={styles.pageIndicator}>
          <span style={styles.pageText}>
            Page {currentPage + 1} of {totalPages}
          </span>
          <div style={styles.pageDots}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <span
                key={i}
                style={{
                  ...styles.pageDot,
                  background: i === currentPage ? '#00bcd4' : '#ccc',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e0d8d0',
    flexShrink: 0,
  },
  tableWrapper: {
    overflow: 'hidden',
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
    padding: '10px 24px',
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
  pageIndicator: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 24px',
    background: '#faf8f5',
    borderTop: '1px solid #e0d8d0',
  },
  pageText: {
    fontSize: '12px',
    color: '#888',
    fontWeight: 500,
  },
  pageDots: {
    display: 'flex',
    gap: '6px',
  },
  pageDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'background 0.3s',
  },
};
