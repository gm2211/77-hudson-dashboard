import { useState, useEffect, useCallback } from 'react';
import type { Service, Event, Advisory, BuildingConfig } from '../types';
import { api } from '../utils/api';
import { smallBtn, headerBtn, headerBtnSecondary, modalOverlay, modal } from '../styles';
import {
  SnapshotHistory,
  ConfigSection,
  ServicesSection,
  EventsSection,
  AdvisoriesSection,
} from '../components/admin';

type SectionChanges = {
  config: boolean;
  services: boolean;
  events: boolean;
  advisories: boolean;
};

type PublishedData = {
  services: Service[];
  events: Event[];
  advisories: Advisory[];
  config: BuildingConfig | null;
} | null;

export default function Admin() {
  const [services, setServices] = useState<Service[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [config, setConfig] = useState<BuildingConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [sectionChanges, setSectionChanges] = useState<SectionChanges>({ config: false, services: false, events: false, advisories: false });
  const [published, setPublished] = useState<PublishedData>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const checkDraft = useCallback(async () => {
    const d = await api.get('/api/snapshots/draft-status');
    setHasChanges(d.hasChanges);
    setSectionChanges(d.sectionChanges || { config: false, services: false, events: false, advisories: false });
    setPublished(d.published || null);
    // Use current data from draft-status to avoid a separate load() call
    if (d.current) {
      setServices(d.current.services || []);
      setEvents(d.current.events || []);
      setAdvisories(d.current.advisories || []);
      setConfig(d.current.config || null);
    }
  }, []);

  const onSave = useCallback(async () => {
    await checkDraft();
  }, [checkDraft]);

  // Lighter callback for config changes - doesn't reload config
  const onConfigSave = useCallback(() => {
    checkDraft();
  }, [checkDraft]);

  useEffect(() => { checkDraft(); }, [checkDraft]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (previewOpen || historyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewOpen, historyOpen]);

  const publish = async () => {
    const result = await api.post('/api/snapshots');
    // Use the returned state directly for both current data and published
    // This ensures they're identical, eliminating false "changed" indicators
    if (result.state) {
      setServices(result.state.services || []);
      setEvents(result.state.events || []);
      setAdvisories(result.state.advisories || []);
      setConfig(result.state.config || null);
      setPublished(result.state);
      setHasChanges(false);
      setSectionChanges({ config: false, services: false, events: false, advisories: false });
    } else {
      // Fallback to old behavior if state not returned
      await onSave();
    }
  };

  const discard = async () => {
    if (!confirm('Discard all unpublished changes?')) return;
    await api.post('/api/snapshots/discard');
    await onSave();
  };

  const pendingBgStyle: React.CSSProperties = hasChanges ? {
    boxShadow: 'inset 0 0 30px 8px rgba(255, 170, 0, 0.45)',
  } : {};

  return (
    <div style={{ ...styles.pageWrap, ...pendingBgStyle }}>
      <div className="admin-page" style={styles.page}>
        <header className="admin-header" style={{ ...styles.header, position: 'sticky', top: 0, zIndex: 100, background: '#0a1628' }}>
          <div>
            <h1 style={{ margin: 0 }}>Hudson Dashboard — Admin</h1>
            {hasChanges && <span style={{ color: '#ffc107', fontSize: '13px' }}>● Unpublished changes</span>}
          </div>
          <div className="admin-header-buttons" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              style={{
                ...headerBtn,
                ...(hasChanges ? {} : { opacity: 0.5, cursor: 'not-allowed' }),
              }}
              onClick={hasChanges ? publish : undefined}
              disabled={!hasChanges}
            >Publish</button>
            <button style={{ ...headerBtn, ...headerBtnSecondary }} onClick={discard}>Discard</button>
            <button style={{ ...headerBtn, ...headerBtnSecondary }} onClick={() => setPreviewOpen(true)}>Preview</button>
            <button style={{ ...headerBtn, ...headerBtnSecondary }} onClick={() => setHistoryOpen(true)}>History</button>
            <a href="/" style={styles.link}>← Dashboard</a>
          </div>
        </header>

        <ConfigSection config={config} onSave={onConfigSave} hasChanged={sectionChanges.config} publishedConfig={published?.config || null} />
        <ServicesSection services={services} config={config} onSave={onSave} hasChanged={sectionChanges.services} publishedServices={published?.services || null} />
        <EventsSection events={events} config={config} onSave={onSave} hasChanged={sectionChanges.events} publishedEvents={published?.events || null} />
        <AdvisoriesSection advisories={advisories} config={config} onSave={onSave} hasChanged={sectionChanges.advisories} publishedAdvisories={published?.advisories || null} />
      </div>

      {previewOpen && (
        <div style={modalOverlay} onClick={() => setPreviewOpen(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ color: '#e0e0e0' }}>Preview (Draft)</strong>
              <button style={smallBtn} onClick={() => setPreviewOpen(false)}>Close</button>
            </div>
            <iframe src="/?preview=true" style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} />
          </div>
        </div>
      )}

      {historyOpen && (
        <div style={modalOverlay} onClick={() => setHistoryOpen(false)}>
          <div style={{ ...modal, width: '700px', maxWidth: '90vw', height: 'auto', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ color: '#e0e0e0' }}>Version History</strong>
              <button style={smallBtn} onClick={() => setHistoryOpen(false)}>Close</button>
            </div>
            <SnapshotHistory onRestore={() => { onSave(); setHistoryOpen(false); }} onItemRestore={onSave} />
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '24px 0 12px', fontSize: '11px', color: '#555' }}>
        Brought to you by <a href="https://github.com/gm2211" style={{ color: '#666' }} target="_blank" rel="noopener noreferrer">gm2211</a>
      </footer>

      <style>{`
        html, body { background: #0a1628; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 1;
          filter: invert(0.8);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .shake {
          animation: shake 0.4s ease-in-out;
        }
        .field-error {
          border-color: #f44336 !important;
          box-shadow: 0 0 0 1px #f44336;
        }
      `}</style>
    </div>
  );
}

// All section components moved to ../components/admin/sections/

/**
 * Page-level styles for Admin component.
 * Section-specific styles are now in their respective section components.
 */
const styles: Record<string, React.CSSProperties> = {
  pageWrap: { background: '#0a1628', minHeight: '100vh' },
  page: { maxWidth: '900px', margin: '0 auto', padding: '24px', color: '#e0e0e0' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid #1a3050',
    paddingBottom: '16px',
  },
  link: { color: '#00bcd4', textDecoration: 'none', fontSize: '14px', whiteSpace: 'nowrap' },
};
