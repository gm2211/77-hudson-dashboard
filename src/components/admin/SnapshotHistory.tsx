import { useState, useEffect, useCallback } from 'react';
import type { Snapshot, SnapshotDiff, Service, Event, Advisory } from '../../types';
import { api } from '../../utils/api';

interface SnapshotHistoryProps {
  onRestore: () => void;
}

export function SnapshotHistory({ onRestore }: SnapshotHistoryProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [diff, setDiff] = useState<SnapshotDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);

  useEffect(() => {
    api.get<Snapshot[]>('/api/snapshots').then(setSnapshots);
  }, []);

  // Navigation for preview
  const goToPrevVersion = useCallback(() => {
    if (previewVersion === null || snapshots.length === 0) return;
    const currentIndex = snapshots.findIndex(s => s.version === previewVersion);
    if (currentIndex < snapshots.length - 1) {
      setPreviewVersion(snapshots[currentIndex + 1].version);
    }
  }, [previewVersion, snapshots]);

  const goToNextVersion = useCallback(() => {
    if (previewVersion === null || snapshots.length === 0) return;
    const currentIndex = snapshots.findIndex(s => s.version === previewVersion);
    if (currentIndex > 0) {
      setPreviewVersion(snapshots[currentIndex - 1].version);
    }
  }, [previewVersion, snapshots]);

  // Keyboard navigation
  useEffect(() => {
    if (previewVersion === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevVersion();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextVersion();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPreviewVersion(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewVersion, goToPrevVersion, goToNextVersion]);

  const loadDiff = async (version: number) => {
    if (selectedVersion === version) {
      setSelectedVersion(null);
      setDiff(null);
      return;
    }
    setLoading(true);
    setSelectedVersion(version);
    const data = await api.get<SnapshotDiff>(`/api/snapshots/${version}/diff/draft`);
    setDiff(data);
    setLoading(false);
  };

  const restoreFull = async (version: number) => {
    if (!confirm(`Restore entire snapshot v${version}? This will create a new version with that state.`)) return;
    await api.post(`/api/snapshots/restore/${version}`);
    setSelectedVersion(null);
    setDiff(null);
    api.get<Snapshot[]>('/api/snapshots').then(setSnapshots);
    onRestore();
  };

  const deleteSnapshot = async (version: number) => {
    if (!confirm(`Delete snapshot v${version}? This cannot be undone.`)) return;
    await api.del(`/api/snapshots/${version}`);
    api.get<Snapshot[]>('/api/snapshots').then(setSnapshots);
  };

  const purgeAllHistory = async () => {
    if (!confirm('Delete all old snapshots and keep only the latest version? This cannot be undone.')) return;
    await api.del('/api/snapshots');
    api.get<Snapshot[]>('/api/snapshots').then(setSnapshots);
  };

  if (snapshots.length === 0) {
    return (
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Version History</h2>
        <p style={{ color: '#888', fontSize: '14px' }}>No published versions yet.</p>
      </section>
    );
  }

  return (
    <section style={styles.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Version History</h2>
        {snapshots.length > 1 && (
          <button
            style={{ ...styles.smallBtn, background: '#b71c1c', fontSize: '11px' }}
            onClick={purgeAllHistory}
          >
            Purge Old Versions
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {snapshots.map((s, index) => (
          <div key={s.version}>
            <div style={styles.snapshotRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 600, color: '#00bcd4' }}>v{s.version}</span>
                <span style={{ color: '#888', fontSize: '13px' }}>
                  {new Date(s.publishedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  style={{ ...styles.smallBtn, background: '#1976d2' }}
                  onClick={() => setPreviewVersion(s.version)}
                >
                  Preview
                </button>
                <button
                  style={{ ...styles.smallBtn, background: selectedVersion === s.version ? '#00838f' : '#444' }}
                  onClick={() => loadDiff(s.version)}
                >
                  {selectedVersion === s.version ? 'Hide Diff' : 'Diff'}
                </button>
                <button
                  style={{ ...styles.smallBtn, background: '#4caf50' }}
                  onClick={() => restoreFull(s.version)}
                >
                  Restore All
                </button>
                {snapshots.length > 1 && (
                  <button
                    style={{ ...styles.smallBtn, background: '#b71c1c' }}
                    onClick={() => deleteSnapshot(s.version)}
                    title="Delete this snapshot"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {selectedVersion === s.version && (
              <div style={styles.diffPanel}>
                {loading ? (
                  <p style={{ color: '#888' }}>Loading diff...</p>
                ) : diff ? (
                  <SnapshotDiffView
                    diff={diff}
                    sourceVersion={s.version}
                    onRestore={onRestore}
                    onClose={() => {
                      setSelectedVersion(null);
                      setDiff(null);
                    }}
                  />
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {previewVersion !== null && (() => {
        const currentIndex = snapshots.findIndex(s => s.version === previewVersion);
        const hasPrev = currentIndex < snapshots.length - 1;
        const hasNext = currentIndex > 0;
        return (
          <div style={styles.modalOverlay} onClick={() => setPreviewVersion(null)}>
            {/* Left arrow */}
            <button
              style={{
                ...styles.navArrow,
                left: '16px',
                opacity: hasPrev ? 1 : 0.3,
                cursor: hasPrev ? 'pointer' : 'default',
              }}
              onClick={e => { e.stopPropagation(); goToPrevVersion(); }}
              disabled={!hasPrev}
              title={hasPrev ? `Previous: v${snapshots[currentIndex + 1]?.version}` : 'No older version'}
            >
              ←
            </button>

            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ color: '#e0e0e0' }}>Preview — Version {previewVersion}</strong>
                  <span style={{ color: '#666', fontSize: '12px' }}>← → to navigate, Esc to close</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...styles.smallBtn, background: '#4caf50' }}
                    onClick={() => {
                      restoreFull(previewVersion);
                      setPreviewVersion(null);
                    }}
                  >
                    Restore This Version
                  </button>
                  <button style={{ ...styles.smallBtn, background: '#555' }} onClick={() => setPreviewVersion(null)}>
                    Close
                  </button>
                </div>
              </div>
              <iframe
                src={`/?snapshot=${previewVersion}`}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
              />
            </div>

            {/* Right arrow */}
            <button
              style={{
                ...styles.navArrow,
                right: '16px',
                opacity: hasNext ? 1 : 0.3,
                cursor: hasNext ? 'pointer' : 'default',
              }}
              onClick={e => { e.stopPropagation(); goToNextVersion(); }}
              disabled={!hasNext}
              title={hasNext ? `Next: v${snapshots[currentIndex - 1]?.version}` : 'No newer version'}
            >
              →
            </button>
          </div>
        );
      })()}
    </section>
  );
}

interface SnapshotDiffViewProps {
  diff: SnapshotDiff;
  sourceVersion: number;
  onRestore: () => void;
  onClose: () => void;
}

function SnapshotDiffView({ diff, sourceVersion, onRestore, onClose }: SnapshotDiffViewProps) {
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [selectedAdvisories, setSelectedAdvisories] = useState<Set<number>>(new Set());

  const hasAnyDiff =
    diff.services.added.length > 0 ||
    diff.services.removed.length > 0 ||
    diff.services.changed.length > 0 ||
    diff.events.added.length > 0 ||
    diff.events.removed.length > 0 ||
    diff.events.changed.length > 0 ||
    diff.advisories.added.length > 0 ||
    diff.advisories.removed.length > 0 ||
    diff.advisories.changed.length > 0 ||
    (diff.config?.changed?.length ?? 0) > 0;

  if (!hasAnyDiff) {
    return (
      <div style={{ padding: '12px', color: '#888' }}>
        No differences between v{sourceVersion} and current draft.
      </div>
    );
  }

  const toggleService = (id: number) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEvent = (id: number) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAdvisory = (id: number) => {
    setSelectedAdvisories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const restoreSelected = async () => {
    const items: { services?: number[]; events?: number[]; advisories?: number[] } = {};
    if (selectedServices.size > 0) items.services = Array.from(selectedServices);
    if (selectedEvents.size > 0) items.events = Array.from(selectedEvents);
    if (selectedAdvisories.size > 0) items.advisories = Array.from(selectedAdvisories);

    if (Object.keys(items).length === 0) {
      alert('Please select at least one item to restore.');
      return;
    }

    await api.post('/api/snapshots/restore-items', { sourceVersion, items });
    setSelectedServices(new Set());
    setSelectedEvents(new Set());
    setSelectedAdvisories(new Set());
    onRestore();
  };

  const restoreSingleItem = async (type: 'services' | 'events' | 'advisories', id: number) => {
    await api.post('/api/snapshots/restore-items', {
      sourceVersion,
      items: { [type]: [id] },
    });
    onRestore();
  };

  const selectAllInSection = (type: 'services' | 'events' | 'advisories') => {
    const ids: number[] = [];
    if (type === 'services') {
      diff.services.removed.forEach((s) => ids.push(s.id));
      diff.services.changed.forEach((c) => ids.push(c.from.id));
    } else if (type === 'events') {
      diff.events.removed.forEach((e) => ids.push(e.id));
      diff.events.changed.forEach((c) => ids.push(c.from.id));
    } else {
      diff.advisories.removed.forEach((a) => ids.push(a.id));
      diff.advisories.changed.forEach((c) => ids.push(c.from.id));
    }

    if (type === 'services') setSelectedServices(new Set(ids));
    else if (type === 'events') setSelectedEvents(new Set(ids));
    else setSelectedAdvisories(new Set(ids));
  };

  const totalSelected = selectedServices.size + selectedEvents.size + selectedAdvisories.size;

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
        Comparing v{sourceVersion} → Current Draft
      </div>

      {/* Services */}
      {(diff.services.added.length > 0 || diff.services.removed.length > 0 || diff.services.changed.length > 0) && (
        <DiffSection
          title="SERVICES"
          onSelectAll={() => selectAllInSection('services')}
        >
          {diff.services.added.map((s) => (
            <DiffItem key={s.id} type="added" label={s.name} description="New in draft" />
          ))}
          {diff.services.removed.map((s) => (
            <DiffItem
              key={s.id}
              type="removed"
              label={s.name}
              description={`Was ${s.status}`}
              checked={selectedServices.has(s.id)}
              onToggle={() => toggleService(s.id)}
              onRestore={() => restoreSingleItem('services', s.id)}
            />
          ))}
          {diff.services.changed.map((c) => (
            <DiffItem
              key={c.from.id}
              type="changed"
              label={c.to.name}
              description={describeServiceChange(c.from, c.to)}
              checked={selectedServices.has(c.from.id)}
              onToggle={() => toggleService(c.from.id)}
              onRestore={() => restoreSingleItem('services', c.from.id)}
            />
          ))}
        </DiffSection>
      )}

      {/* Events */}
      {(diff.events.added.length > 0 || diff.events.removed.length > 0 || diff.events.changed.length > 0) && (
        <DiffSection
          title="EVENTS"
          onSelectAll={() => selectAllInSection('events')}
        >
          {diff.events.added.map((e) => (
            <DiffItem key={e.id} type="added" label={e.title} description="New in draft" />
          ))}
          {diff.events.removed.map((e) => (
            <DiffItem
              key={e.id}
              type="removed"
              label={e.title}
              description="Was removed"
              checked={selectedEvents.has(e.id)}
              onToggle={() => toggleEvent(e.id)}
              onRestore={() => restoreSingleItem('events', e.id)}
            />
          ))}
          {diff.events.changed.map((c) => (
            <DiffItem
              key={c.from.id}
              type="changed"
              label={c.to.title}
              description={describeEventChange(c.from, c.to)}
              checked={selectedEvents.has(c.from.id)}
              onToggle={() => toggleEvent(c.from.id)}
              onRestore={() => restoreSingleItem('events', c.from.id)}
            />
          ))}
        </DiffSection>
      )}

      {/* Advisories */}
      {(diff.advisories.added.length > 0 || diff.advisories.removed.length > 0 || diff.advisories.changed.length > 0) && (
        <DiffSection
          title="ADVISORIES"
          onSelectAll={() => selectAllInSection('advisories')}
        >
          {diff.advisories.added.map((a) => (
            <DiffItem key={a.id} type="added" label={a.label} description="New in draft" />
          ))}
          {diff.advisories.removed.map((a) => (
            <DiffItem
              key={a.id}
              type="removed"
              label={a.label}
              description={`"${a.message.slice(0, 30)}..."`}
              checked={selectedAdvisories.has(a.id)}
              onToggle={() => toggleAdvisory(a.id)}
              onRestore={() => restoreSingleItem('advisories', a.id)}
            />
          ))}
          {diff.advisories.changed.map((c) => (
            <DiffItem
              key={c.from.id}
              type="changed"
              label={c.to.label}
              description={describeAdvisoryChange(c.from, c.to)}
              checked={selectedAdvisories.has(c.from.id)}
              onToggle={() => toggleAdvisory(c.from.id)}
              onRestore={() => restoreSingleItem('advisories', c.from.id)}
            />
          ))}
        </DiffSection>
      )}

      {/* Config */}
      {(diff.config?.changed?.length ?? 0) > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#888', letterSpacing: '0.5px', marginBottom: '8px' }}>
            CONFIG
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {diff.config.changed.map((c) => (
              <DiffItem
                key={c.field}
                type="changed"
                label={c.field}
                description={`${c.from || '(empty)'} → ${c.to || '(empty)'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
        {totalSelected > 0 && (
          <button style={{ ...styles.btn, background: '#00838f' }} onClick={restoreSelected}>
            Restore Selected ({totalSelected})
          </button>
        )}
      </div>
    </div>
  );
}

function DiffSection({ title, children, onSelectAll }: { title: string; children: React.ReactNode; onSelectAll: () => void }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#888', letterSpacing: '0.5px' }}>{title}</span>
        <button style={{ ...styles.smallBtn, background: '#333', fontSize: '10px' }} onClick={onSelectAll}>
          Select All
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>{children}</div>
    </div>
  );
}

interface DiffItemProps {
  type: 'added' | 'removed' | 'changed';
  label: string;
  description: string;
  checked?: boolean;
  onToggle?: () => void;
  onRestore?: () => void;
}

function DiffItem({ type, label, description, checked, onToggle, onRestore }: DiffItemProps) {
  const icon = type === 'added' ? '[+]' : type === 'removed' ? '[-]' : '[~]';
  const color = type === 'added' ? '#4caf50' : type === 'removed' ? '#f44336' : '#ffc107';

  return (
    <div style={styles.diffItem}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        {onToggle && (
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            style={{ cursor: 'pointer' }}
          />
        )}
        <span style={{ color, fontFamily: 'monospace', fontSize: '12px' }}>{icon}</span>
        <span style={{ color: '#e0e0e0' }}>{label}</span>
        <span style={{ color: '#666', fontSize: '12px' }}>{description}</span>
      </div>
      {onRestore && (
        <button
          style={{ ...styles.smallBtn, background: '#4caf50', fontSize: '10px' }}
          onClick={onRestore}
        >
          Restore
        </button>
      )}
    </div>
  );
}

function describeServiceChange(from: Service, to: Service): string {
  const changes: string[] = [];
  if (from.status !== to.status) changes.push(`${from.status} → ${to.status}`);
  if ((from.notes || '') !== (to.notes || '')) changes.push('notes changed');
  if (from.name !== to.name) changes.push(`renamed from "${from.name}"`);
  return changes.join(', ') || 'modified';
}

function describeEventChange(from: Event, to: Event): string {
  const changes: string[] = [];
  if (from.title !== to.title) changes.push('title changed');
  if (from.subtitle !== to.subtitle) changes.push('subtitle changed');
  if (JSON.stringify(from.details) !== JSON.stringify(to.details)) changes.push('details changed');
  if (from.imageUrl !== to.imageUrl) changes.push('image changed');
  return changes.join(', ') || 'modified';
}

function describeAdvisoryChange(from: Advisory, to: Advisory): string {
  const changes: string[] = [];
  if (from.label !== to.label) changes.push('label changed');
  if (from.message !== to.message) changes.push('message changed');
  if (from.active !== to.active) changes.push(to.active ? 'activated' : 'deactivated');
  return changes.join(', ') || 'modified';
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    background: '#132038',
    borderRadius: '12px',
    border: '1px solid #1a3050',
    padding: '20px',
    marginBottom: '20px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '85vw',
    height: '85vh',
    background: '#132038',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0, 0, 0, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    color: '#fff',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
  sectionTitle: {
    margin: '0 0 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#e0e0e0',
  },
  snapshotRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    background: 'rgba(0, 0, 0, 0.15)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
  },
  diffPanel: {
    marginTop: '8px',
    marginLeft: '16px',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  diffItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(0, 0, 0, 0.15)',
    borderRadius: '6px',
  },
  smallBtn: {
    border: 'none',
    borderRadius: '4px',
    padding: '4px 10px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
  },
  btn: {
    background: '#00838f',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 600,
  },
};
