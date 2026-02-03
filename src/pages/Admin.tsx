import { useState, useEffect, useCallback, useRef } from 'react';
import type { Service, Event, Advisory, BuildingConfig } from '../types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const api = {
  get: (url: string) => fetch(url).then(r => r.json()),
  post: (url: string, body?: any) => fetch(url, { method: 'POST', headers: JSON_HEADERS, body: body ? JSON.stringify(body) : undefined }).then(r => r.json()),
  put: (url: string, body: any) => fetch(url, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) }).then(r => r.json()),
  del: (url: string) => fetch(url, { method: 'DELETE' }).then(r => r.json()),
};

const STATUS_COLORS: Record<string, string> = {
  Operational: '#4caf50',
  Maintenance: '#ffc107',
  Outage: '#f44336',
};

function useTrash<T>(endpoint: string, onSave: () => void) {
  const [trash, setTrash] = useState<T[]>([]);
  const loadTrash = useCallback(() => { api.get(`${endpoint}/trash`).then(setTrash); }, [endpoint]);
  useEffect(() => { loadTrash(); }, [loadTrash]);
  const reload = () => { onSave(); loadTrash(); };
  const remove = async (id: number) => { await api.del(`${endpoint}/${id}`); reload(); };
  return { trash, reload, remove };
}

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

  const load = useCallback(() => {
    api.get('/api/services').then(setServices);
    api.get('/api/events').then(setEvents);
    api.get('/api/advisories').then(setAdvisories);
    api.get('/api/config').then(setConfig);
  }, []);

  const checkDraft = useCallback(() => {
    api.get('/api/draft-status').then(d => {
      setHasChanges(d.hasChanges);
      setSectionChanges(d.sectionChanges || { config: false, services: false, events: false, advisories: false });
      setPublished(d.published || null);
    });
  }, []);

  const onSave = useCallback(() => {
    load();
    checkDraft();
  }, [load, checkDraft]);

  useEffect(() => { load(); checkDraft(); }, [load, checkDraft]);

  const publish = async () => {
    await api.post('/api/publish');
    checkDraft();
  };

  const discard = async () => {
    if (!confirm('Discard all unpublished changes?')) return;
    await api.post('/api/discard');
    onSave();
  };

  const pendingBgStyle: React.CSSProperties = hasChanges ? {
    boxShadow: 'inset 0 0 30px 8px rgba(255, 170, 0, 0.45)',
  } : {};

  return (
    <div style={{ ...styles.pageWrap, ...pendingBgStyle }}>
      <div style={styles.page}>
        <header style={{ ...styles.header, position: 'sticky', top: 0, zIndex: 100, background: '#0a1628' }}>
          <div>
            <h1 style={{ margin: 0 }}>Hudson Dashboard — Admin</h1>
            {hasChanges && <span style={{ color: '#ffc107', fontSize: '13px' }}>● Unpublished changes</span>}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              style={{
                ...styles.headerBtn,
                ...(hasChanges ? {} : { opacity: 0.5, cursor: 'not-allowed' }),
              }}
              onClick={hasChanges ? publish : undefined}
              disabled={!hasChanges}
            >Publish</button>
            <button style={{ ...styles.headerBtn, ...styles.headerBtnSecondary }} onClick={discard}>Discard</button>
            <button style={{ ...styles.headerBtn, ...styles.headerBtnSecondary }} onClick={() => setPreviewOpen(true)}>Preview</button>
            <a href="/" style={styles.link}>← Dashboard</a>
          </div>
        </header>

        <ConfigSection config={config} onSave={onSave} hasChanged={sectionChanges.config} />
        <ServicesSection services={services} onSave={onSave} hasChanged={sectionChanges.services} publishedServices={published?.services || null} />
        <EventsSection events={events} config={config} onSave={onSave} hasChanged={sectionChanges.events} publishedEvents={published?.events || null} />
        <AdvisoriesSection advisories={advisories} config={config} onSave={onSave} hasChanged={sectionChanges.advisories} publishedAdvisories={published?.advisories || null} />
      </div>

      {previewOpen && (
        <div style={styles.modalOverlay} onClick={() => setPreviewOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ color: '#e0e0e0' }}>Preview (Draft)</strong>
              <button style={styles.smallBtn} onClick={() => setPreviewOpen(false)}>Close</button>
            </div>
            <iframe src="/?preview=true" style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} />
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '24px 0 12px', fontSize: '11px', color: '#555' }}>
        Brought to you by <a href="https://github.com/gm2211" style={{ color: '#666' }} target="_blank" rel="noopener noreferrer">gm2211</a>
      </footer>

      <style>{`
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

function StatusSelect({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  return (
    <select
      style={{ ...styles.input, color: STATUS_COLORS[value] || '#e0e0e0', fontWeight: 600, ...style }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="Operational" style={{ color: STATUS_COLORS.Operational }}>Operational</option>
      <option value="Maintenance" style={{ color: STATUS_COLORS.Maintenance }}>Maintenance</option>
      <option value="Outage" style={{ color: STATUS_COLORS.Outage }}>Outage</option>
    </select>
  );
}

function ConfigSection({ config, onSave, hasChanged }: { config: BuildingConfig | null; onSave: () => void; hasChanged: boolean }) {
  const [form, setForm] = useState({ buildingNumber: '', buildingName: '', subtitle: '' });

  useEffect(() => {
    if (config) setForm({ buildingNumber: config.buildingNumber, buildingName: config.buildingName, subtitle: config.subtitle });
  }, [config]);

  const save = async () => {
    await api.put('/api/config', form);
    onSave();
  };

  return (
    <section style={{ ...styles.section, ...(hasChanged ? styles.sectionChanged : {}) }}>
      <h2 style={styles.sectionTitle}>
        Building Config
        {hasChanged && <span style={styles.changeIndicator}>●</span>}
      </h2>
      <div style={{ ...styles.formGroup, marginBottom: 0 }}>
        <span style={styles.formLabel}>Building Details</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input style={styles.input} placeholder="Building #" value={form.buildingNumber} onChange={e => setForm({ ...form, buildingNumber: e.target.value })} />
          <input style={styles.input} placeholder="Building Name" value={form.buildingName} onChange={e => setForm({ ...form, buildingName: e.target.value })} />
          <input style={{ ...styles.input, flex: 1 }} placeholder="Subtitle" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
          <button style={styles.btn} onClick={save}>Save Draft</button>
        </div>
      </div>
    </section>
  );
}

function TrashSection<T extends { id: number }>({ type, items, labelFn, onReload }: { type: string; items: T[]; labelFn: (item: T) => string; onReload: () => void }) {
  const [open, setOpen] = useState(true);

  const restore = async (id: number) => {
    await api.post(`/api/${type}/${id}/restore`);
    onReload();
  };

  const purge = async (id: number) => {
    await api.del(`/api/${type}/${id}/purge`);
    onReload();
  };

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: '12px' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#888', fontSize: '13px', marginBottom: open ? '8px' : 0 }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontSize: '10px' }}>{open ? '▼' : '▶'}</span>
        <span>Trash ({items.length})</span>
      </div>
      {open && (
        <ul style={styles.list}>
          {items.map(item => (
            <li key={item.id} style={{ ...styles.listItem, opacity: 0.6 }}>
              <span>{labelFn(item)}</span>
              <span>
                <button style={{ ...styles.smallBtn, background: '#4caf50' }} onClick={() => restore(item.id)}>Restore</button>
                <button style={{ ...styles.smallBtn, background: '#f44336' }} onClick={() => purge(item.id)}>Purge</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ServicesSection({ services, onSave, hasChanged, publishedServices }: { services: Service[]; onSave: () => void; hasChanged: boolean; publishedServices: Service[] | null }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Operational');
  const [expandedNotes, setExpandedNotes] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const { trash, reload, remove } = useTrash<Service>('/api/services', onSave);

  const add = async () => {
    if (!name) return;
    await api.post('/api/services', { name, status, sortOrder: services.length });
    setName('');
    reload();
  };

  const markForDeletion = async (id: number) => {
    await api.del(`/api/services/${id}`);
    onSave();
  };

  const unmarkForDeletion = async (id: number) => {
    await api.post(`/api/services/${id}/unmark`);
    onSave();
  };

  const changeStatus = async (s: Service, newStatus: string) => {
    await api.put(`/api/services/${s.id}`, { status: newStatus, lastChecked: new Date().toISOString() });
    onSave();
  };

  const updateNotes = async (s: Service, notes: string) => {
    await api.put(`/api/services/${s.id}`, { notes });
    onSave();
  };

  const setLastCheckedNow = async (s: Service) => {
    await api.put(`/api/services/${s.id}`, { lastChecked: new Date().toISOString() });
    onSave();
  };

  const formatLastChecked = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getPublishedService = (id: number): Service | undefined => {
    return publishedServices?.find(ps => ps.id === id);
  };

  return (
    <section style={{ ...styles.section, ...(hasChanged ? styles.sectionChanged : {}) }}>
      <h2 style={styles.sectionTitle}>
        Services
        {hasChanged && <span style={styles.changeIndicator}>●</span>}
      </h2>
      <div style={styles.formGroup}>
        <span style={styles.formLabel}>Add New Service</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input style={styles.input} placeholder="Service name" value={name} onChange={e => setName(e.target.value)} />
          <StatusSelect value={status} onChange={setStatus} />
          <button style={styles.btn} onClick={add}>Add Service to Draft</button>
        </div>
      </div>
      {services.length > 0 && (
        <div style={styles.listHeader}>
          <span>Current Services</span>
          <span style={{ fontSize: '11px', color: '#666' }}>{services.length} item{services.length !== 1 ? 's' : ''}</span>
        </div>
      )}
      <div>
        {services.map(s => {
          const pub = getPublishedService(s.id);
          const isNewDraft = !pub;
          const isMarkedForDeletion = s.markedForDeletion;
          const statusChanged = pub && pub.status !== s.status;
          const timeChanged = pub && pub.lastChecked !== s.lastChecked;
          const notesChanged = pub && (s.notes || '') !== (pub.notes || '');
          const isExpanded = expandedNotes === s.id && !isMarkedForDeletion;

          return (
            <div key={s.id} style={{ ...styles.listCard, ...(isMarkedForDeletion ? styles.markedForDeletion : {}) }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px', ...(isMarkedForDeletion ? { textDecoration: 'line-through', opacity: 0.5 } : {}) }}>
                    {isNewDraft && !isMarkedForDeletion && <span style={styles.draftIndicator} title="New draft item">●</span>}
                    {isMarkedForDeletion && <span style={{ color: '#f44336', fontSize: '10px' }} title="Will be deleted on publish">🗑</span>}
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: '11px', color: '#888' }}>
                      Last: {formatLastChecked(s.lastChecked)}
                      {timeChanged && !isMarkedForDeletion && (
                        <span style={styles.changedValue}> was {formatLastChecked(pub.lastChecked)}</span>
                      )}
                    </span>
                    {s.notes && !isExpanded && (
                      <span style={{ fontSize: '10px', color: '#666', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        "{s.notes}"
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isMarkedForDeletion ? (
                      <button style={{ ...styles.smallBtn, background: '#4caf50' }} onClick={() => unmarkForDeletion(s.id)}>Undo</button>
                    ) : (
                      <>
                        <button
                          style={{ ...styles.smallBtn, background: isExpanded ? '#00838f' : '#444', fontSize: '10px' }}
                          onClick={() => setExpandedNotes(isExpanded ? null : s.id)}
                          title={s.notes ? 'Edit note' : 'Add note'}
                        >
                          {s.notes ? '📝' : '+ Note'}
                        </button>
                        <button style={{ ...styles.smallBtn, background: '#555', fontSize: '10px' }} onClick={() => setLastCheckedNow(s)} title="Mark as just checked">Just Checked</button>
                        {statusChanged && (
                          <span style={{ fontSize: '10px', opacity: 0.8, color: STATUS_COLORS[pub.status] }}>{pub.status} →</span>
                        )}
                        <StatusSelect value={s.status} onChange={v => changeStatus(s, v)} style={{ padding: '4px 8px', fontSize: '12px' }} />
                        <button style={{ ...styles.smallBtn, background: '#f44336' }} onClick={() => markForDeletion(s.id)}>✕</button>
                      </>
                    )}
                  </span>
                </div>
                {isExpanded && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      style={{ ...styles.input, flex: 1, fontSize: '12px', padding: '6px 10px' }}
                      placeholder="Add a note about this service status..."
                      value={editingNotes[s.id] ?? s.notes ?? ''}
                      onChange={e => setEditingNotes({ ...editingNotes, [s.id]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const newNotes = editingNotes[s.id] ?? s.notes ?? '';
                          if (newNotes !== (s.notes || '')) {
                            updateNotes(s, newNotes);
                            setEditingNotes(prev => { const copy = { ...prev }; delete copy[s.id]; return copy; });
                          }
                          setExpandedNotes(null);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      style={{ ...styles.smallBtn, background: '#00838f' }}
                      onClick={() => {
                        const newNotes = editingNotes[s.id] ?? s.notes ?? '';
                        updateNotes(s, newNotes);
                        setEditingNotes(prev => { const copy = { ...prev }; delete copy[s.id]; return copy; });
                        setExpandedNotes(null);
                      }}
                    >
                      Save
                    </button>
                    <button
                      style={{ ...styles.smallBtn, background: '#555' }}
                      onClick={() => {
                        setEditingNotes(prev => { const copy = { ...prev }; delete copy[s.id]; return copy; });
                        setExpandedNotes(null);
                      }}
                    >
                      Cancel
                    </button>
                    {notesChanged && <span style={{ fontSize: '10px', color: '#ffc107' }}>changed</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <TrashSection type="services" items={trash} labelFn={s => s.name} onReload={reload} />
    </section>
  );
}

const IMAGE_PRESETS = [
  { label: 'Yoga', url: '/images/yoga.jpg' },
  { label: 'Bagels / Brunch', url: '/images/bagels.jpg' },
  { label: 'Tequila / Drinks', url: '/images/tequila.jpg' },
];

function ImagePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const isPreset = IMAGE_PRESETS.some(p => p.url === value);
  const isCustom = !!value && !isPreset;
  const [showCustom, setShowCustom] = useState(isCustom);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSelect = (v: string) => {
    if (v === '__custom__') {
      setShowCustom(true);
      onChange('');
    } else if (v === '') {
      setShowCustom(false);
      onChange('');
    } else {
      setShowCustom(false);
      onChange(v);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) onChange(data.url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <span style={{ fontSize: '12px', color: '#888' }}>{label}</span>}
      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
        <select
          style={styles.input}
          value={showCustom ? '__custom__' : value}
          onChange={e => handleSelect(e.target.value)}
        >
          <option value="">No image</option>
          {IMAGE_PRESETS.map(p => <option key={p.url} value={p.url}>{p.label}</option>)}
          <option value="__custom__">Custom URL...</option>
        </select>
        {showCustom && (
          <>
            <input
              style={{ ...styles.input, flex: 1 }}
              placeholder="https://..."
              value={value}
              onChange={e => onChange(e.target.value)}
            />
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            <button style={styles.smallBtn} onClick={() => fileRef.current?.click()}>Upload</button>
          </>
        )}
      </div>
    </div>
  );
}

function parseMarkdown(md: string): string {
  const lines = md.split('\n');
  const result: string[] = [];
  let inBulletList = false;
  let inNumberedList = false;
  let listCounter = 0;

  const bulletStyle = 'list-style:none;padding:0;margin:8px 0';
  const olStyle = 'list-style:none;padding:0;margin:8px 0;counter-reset:item';
  const bulletLiStyle = 'display:flex;align-items:baseline;gap:8px;margin-bottom:4px';
  const olLiStyle = 'display:flex;align-items:baseline;gap:8px;margin-bottom:4px;counter-increment:item';

  for (const line of lines) {
    let processed = line;

    // Check for list items
    const bulletMatch = processed.match(/^[-*]\s+(.*)$/);
    const numberedMatch = processed.match(/^\d+\.\s+(.*)$/);

    if (bulletMatch) {
      if (!inBulletList) {
        if (inNumberedList) { result.push('</ol>'); inNumberedList = false; }
        result.push(`<ul style="${bulletStyle}">`);
        inBulletList = true;
      }
      processed = `<li style="${bulletLiStyle}"><span style="color:#e0e0e0;font-size:8px;flex-shrink:0">●</span><span>${bulletMatch[1]}</span></li>`;
    } else if (numberedMatch) {
      if (!inNumberedList) {
        if (inBulletList) { result.push('</ul>'); inBulletList = false; }
        result.push(`<ol style="${olStyle}">`);
        inNumberedList = true;
        listCounter = 0;
      }
      listCounter++;
      processed = `<li style="${olLiStyle}"><span style="color:#e0e0e0;font-size:12px;flex-shrink:0;min-width:16px">${listCounter}.</span><span>${numberedMatch[1]}</span></li>`;
    } else {
      // Close any open lists
      if (inBulletList) { result.push('</ul>'); inBulletList = false; }
      if (inNumberedList) { result.push('</ol>'); inNumberedList = false; listCounter = 0; }

      // Headers
      if (processed.match(/^### (.+)$/)) {
        processed = processed.replace(/^### (.+)$/, '<h3 style="margin:8px 0 4px;font-size:14px">$1</h3>');
      } else if (processed.match(/^## (.+)$/)) {
        processed = processed.replace(/^## (.+)$/, '<h2 style="margin:8px 0 4px;font-size:16px">$1</h2>');
      } else if (processed.match(/^# (.+)$/)) {
        processed = processed.replace(/^# (.+)$/, '<h1 style="margin:8px 0 4px;font-size:18px">$1</h1>');
      } else if (processed.trim() === '') {
        processed = '<br/>';
      } else {
        processed = processed + '<br/>';
      }
    }

    // Inline formatting (apply to all lines)
    processed = processed
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`(.+?)`/g, '<code style="background:#1a3050;padding:2px 4px;border-radius:3px">$1</code>');

    result.push(processed);
  }

  // Close any remaining open lists
  if (inBulletList) result.push('</ul>');
  if (inNumberedList) result.push('</ol>');

  return result.join('');
}

type CardPreviewData = {
  title: string;
  subtitle: string;
  imageUrl: string;
};

function EventCardPreview({ title, subtitle, imageUrl, details }: CardPreviewData & { details: string }) {
  // Match actual EventCard component styling
  const cardStyle: React.CSSProperties = {
    background: imageUrl
      ? `linear-gradient(to right, rgba(20,60,58,0.92) 0%, rgba(20,60,58,0.75) 50%, rgba(20,60,58,0.3) 100%), url(${imageUrl})`
      : 'linear-gradient(135deg, #1a5c5a 0%, #1a4a48 100%)',
    backgroundSize: imageUrl ? '100% 100%, cover' : undefined,
    backgroundPosition: imageUrl ? 'center, center' : undefined,
    backgroundRepeat: 'no-repeat',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '320px',
  };

  const renderedMarkdown = parseMarkdown(details);

  return (
    <div style={cardStyle}>
      <div style={{ padding: '24px 28px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
          {title || <span style={{ color: '#666', fontWeight: 400 }}>No title</span>}
        </h3>
        {(subtitle || !title) && (
          <p style={{ fontSize: '14px', color: '#b0d4d0', margin: '0 0 14px', fontStyle: 'italic' }}>
            {subtitle || <span style={{ color: '#557' }}>No subtitle</span>}
          </p>
        )}
        {details.trim() ? (
          <div
            style={{ fontSize: '14px', color: '#e0e0e0', lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
          />
        ) : (
          <p style={{ margin: 0, color: '#557', fontSize: '13px', fontStyle: 'italic' }}>No details yet</p>
        )}
      </div>
      <div style={{ height: '4px', width: '100%', background: '#00bcd4' }} />
    </div>
  );
}

function MarkdownEditor({ value, onChange, placeholder, cardPreview }: { value: string; onChange: (v: string) => void; placeholder?: string; cardPreview?: CardPreviewData }) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value;
    const selectedText = text.substring(start, end);

    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    onChange(newText);

    // Restore cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      const newPos = selectedText ? start + prefix.length + selectedText.length + suffix.length : start + prefix.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = value;

    // Find the start of the current line
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }

    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const toolbarBtnStyle: React.CSSProperties = {
    background: '#1a3050',
    border: '1px solid #2a4060',
    borderRadius: '4px',
    padding: '4px 8px',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: '12px',
    minWidth: '28px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#888' }}>Details (markdown supported)</span>
        <button
          type="button"
          style={{ ...styles.smallBtn, background: showPreview ? '#00838f' : '#555', marginLeft: 'auto' }}
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? 'Edit' : (cardPreview ? 'Preview Card' : 'Preview')}
        </button>
      </div>
      {!showPreview && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
          <button type="button" style={{ ...toolbarBtnStyle, fontWeight: 'bold' }} onClick={() => insertMarkdown('**')} title="Bold">B</button>
          <button type="button" style={{ ...toolbarBtnStyle, fontStyle: 'italic' }} onClick={() => insertMarkdown('*')} title="Italic">I</button>
          <button type="button" style={{ ...toolbarBtnStyle, textDecoration: 'line-through' }} onClick={() => insertMarkdown('~~')} title="Strikethrough">S</button>
          <button type="button" style={toolbarBtnStyle} onClick={() => insertLinePrefix('- ')} title="Bullet list">•</button>
          <button type="button" style={toolbarBtnStyle} onClick={() => insertLinePrefix('1. ')} title="Numbered list">1.</button>
        </div>
      )}
      {showPreview ? (
        cardPreview ? (
          <EventCardPreview {...cardPreview} details={value} />
        ) : (
          <div
            style={{ ...styles.input, minHeight: '100px', padding: '12px', lineHeight: 1.5, overflow: 'auto' }}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(value) || '<span style="color:#666">Nothing to preview</span>' }}
          />
        )
      ) : (
        <textarea
          ref={textareaRef}
          style={{ ...styles.input, height: '100px', fontFamily: 'monospace', fontSize: '13px' }}
          placeholder={placeholder || "**Bold**, *italic*, ~~strikethrough~~, `code`\n- Bullet list\n1. Numbered list"}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function EventsSection({ events, config, onSave, hasChanged, publishedEvents }: { events: Event[]; config: BuildingConfig | null; onSave: () => void; hasChanged: boolean; publishedEvents: Event[] | null }) {
  const empty = { title: '', subtitle: '', details: '' as string, imageUrl: '' };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [previewingForm, setPreviewingForm] = useState(false);
  const [scrollSpeedText, setScrollSpeedText] = useState(String(config?.scrollSpeed ?? 30));
  const [errors, setErrors] = useState<{ title?: boolean }>({});
  const [shake, setShake] = useState(false);
  const { trash, reload, remove } = useTrash<Event>('/api/events', onSave);

  const markForDeletion = async (id: number) => {
    await api.del(`/api/events/${id}`);
    onSave();
  };

  const unmarkForDeletion = async (id: number) => {
    await api.post(`/api/events/${id}/unmark`);
    onSave();
  };

  useEffect(() => {
    if (config) setScrollSpeedText(String(config.scrollSpeed));
  }, [config]);

  const saveScrollSpeed = async (text: string) => {
    const val = text === '' ? 0 : Math.max(0, Math.min(120, Number(text)));
    setScrollSpeedText(String(val));
    await api.put('/api/config', { scrollSpeed: val });
    onSave();
  };

  const submit = async () => {
    if (!form.title.trim()) {
      setErrors({ title: true });
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setErrors({});
    const body = {
      title: form.title,
      subtitle: form.subtitle,
      details: form.details.split('\n').filter(Boolean),
      imageUrl: form.imageUrl,
      sortOrder: events.length,
    };
    if (editingId) {
      await api.put(`/api/events/${editingId}`, body);
    } else {
      await api.post('/api/events', body);
    }
    setForm(empty);
    setEditingId(null);
    reload();
  };

  const startEdit = (e: Event) => {
    setEditingId(e.id);
    setForm({
      title: e.title,
      subtitle: e.subtitle,
      details: (e.details || []).join('\n'),
      imageUrl: e.imageUrl,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(empty);
  };

  return (
    <section style={{ ...styles.section, ...(hasChanged ? styles.sectionChanged : {}) }}>
      <h2 style={styles.sectionTitle}>
        Events
        {hasChanged && <span style={styles.changeIndicator}>●</span>}
      </h2>
      <div style={styles.formGroup}>
        <span style={styles.formLabel}>{editingId ? 'Edit Event' : 'Add New Event'}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>Title <span style={{ color: '#f44336' }}>*</span></span>
              <input
                className={`${errors.title ? 'field-error' : ''} ${shake && errors.title ? 'shake' : ''}`}
                style={{ ...styles.input, width: '100%' }}
                placeholder="Title"
                value={form.title}
                onChange={e => { setForm({ ...form, title: e.target.value }); setErrors({}); }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>Subtitle</span>
              <input style={{ ...styles.input, width: '100%' }} placeholder="Subtitle" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
            </div>
          </div>
          <ImagePicker label="Image" value={form.imageUrl} onChange={imageUrl => setForm({ ...form, imageUrl })} />
          <MarkdownEditor
            key={editingId ?? 'new'}
            value={form.details}
            onChange={details => setForm({ ...form, details })}
            cardPreview={{ title: form.title, subtitle: form.subtitle, imageUrl: form.imageUrl }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={styles.btn} onClick={submit}>{editingId ? 'Save Draft' : 'Add Event to Draft'}</button>
            <button style={{ ...styles.btn, background: '#00838f' }} onClick={() => setPreviewingForm(true)}>Preview</button>
            {editingId && <button style={{ ...styles.btn, background: '#555' }} onClick={cancelEdit}>Cancel</button>}
          </div>
        </div>
      </div>

      {previewingForm && (
        <div style={styles.modalOverlay} onClick={() => setPreviewingForm(false)}>
          <div onClick={ev => ev.stopPropagation()} style={{ position: 'relative' }}>
            <EventCardPreview
              title={form.title || 'Untitled Event'}
              subtitle={form.subtitle}
              imageUrl={form.imageUrl}
              details={form.details}
            />
            <button
              style={{ ...styles.smallBtn, position: 'absolute', top: '-8px', right: '-8px', background: '#555' }}
              onClick={() => setPreviewingForm(false)}
            >✕</button>
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div style={styles.listHeader}>
          <span>Current Events</span>
          <span style={{ fontSize: '11px', color: '#666' }}>{events.length} item{events.length !== 1 ? 's' : ''}</span>
        </div>
      )}
      <div>
        {events.map(e => {
          const isNewDraft = !publishedEvents?.find(pe => pe.id === e.id);
          const isMarkedForDeletion = e.markedForDeletion;
          return (
            <div key={e.id} style={{ ...styles.listCard, ...(isMarkedForDeletion ? styles.markedForDeletion : {}) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, ...(isMarkedForDeletion ? { textDecoration: 'line-through', opacity: 0.5 } : {}) }}>
                {isNewDraft && !isMarkedForDeletion && <span style={styles.draftIndicator} title="New draft item">●</span>}
                {isMarkedForDeletion && <span style={{ color: '#f44336', fontSize: '10px' }} title="Will be deleted on publish">🗑</span>}
                {e.imageUrl && (
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '6px',
                    backgroundImage: `url(${e.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                  }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{e.title}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>{e.subtitle}</span>
                  <span style={{ fontSize: '10px', color: '#666' }}>
                    {e.details.length} detail{e.details.length !== 1 ? 's' : ''}
                    {e.imageUrl && ' • has image'}
                  </span>
                </div>
              </div>
              <span style={{ display: 'flex', gap: '4px' }}>
                {isMarkedForDeletion ? (
                  <button style={{ ...styles.smallBtn, background: '#4caf50' }} onClick={() => unmarkForDeletion(e.id)}>Undo</button>
                ) : (
                  <>
                    <button style={{ ...styles.smallBtn, background: '#00838f', fontSize: '10px' }} onClick={() => setPreviewEvent(e)}>Preview</button>
                    <button style={{ ...styles.smallBtn, background: '#1976d2' }} onClick={() => startEdit(e)} title="Edit">✎</button>
                    <button style={{ ...styles.smallBtn, background: '#f44336' }} onClick={() => markForDeletion(e.id)} title="Delete">✕</button>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {previewEvent && (
        <div style={styles.modalOverlay} onClick={() => setPreviewEvent(null)}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <EventCardPreview
              title={previewEvent.title}
              subtitle={previewEvent.subtitle}
              imageUrl={previewEvent.imageUrl}
              details={previewEvent.details.join('\n')}
            />
            <button
              style={{ ...styles.smallBtn, position: 'absolute', top: '-8px', right: '-8px', background: '#555' }}
              onClick={() => setPreviewEvent(null)}
            >✕</button>
          </div>
        </div>
      )}
      <TrashSection type="events" items={trash} labelFn={e => e.title} onReload={reload} />

      <div style={{ marginTop: '12px' }}>
        <label style={{ color: '#e0e0e0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Scroll duration
          <input
            style={{ ...styles.input, width: '70px' }}
            type="number"
            min="0"
            max="120"
            value={scrollSpeedText}
            onChange={e => {
              setScrollSpeedText(e.target.value);
              saveScrollSpeed(e.target.value);
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
          seconds (0 = stopped)
        </label>
      </div>
    </section>
  );
}

const ADVISORY_PRESETS = [
  'RESIDENT ADVISORY',
  'MAINTENANCE NOTICE',
  'EMERGENCY ALERT',
  'BUILDING UPDATE',
  'SECURITY NOTICE',
  'WEATHER ADVISORY',
];

function LabelPicker({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  const isCustom = !ADVISORY_PRESETS.includes(value);

  const handleSelect = (v: string) => {
    if (v === '__custom__') {
      onChange('');
    } else {
      onChange(v);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '4px', ...style }}>
      <select
        style={{ ...styles.input, fontWeight: 700, flex: 1 }}
        value={isCustom ? '__custom__' : value}
        onChange={e => handleSelect(e.target.value)}
      >
        {ADVISORY_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="__custom__">+ Custom...</option>
      </select>
      {isCustom && (
        <input
          style={{ ...styles.input, flex: 1, fontWeight: 700 }}
          placeholder="Custom label"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function AdvisoriesSection({ advisories, config, onSave, hasChanged, publishedAdvisories }: { advisories: Advisory[]; config: BuildingConfig | null; onSave: () => void; hasChanged: boolean; publishedAdvisories: Advisory[] | null }) {
  const [form, setForm] = useState({ label: ADVISORY_PRESETS[0], message: '' });
  const [tickerSpeedText, setTickerSpeedText] = useState(String(config?.tickerSpeed ?? 25));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ label: '', message: '' });
  const { trash, reload, remove } = useTrash<Advisory>('/api/advisories', onSave);

  useEffect(() => {
    if (config) setTickerSpeedText(String(config.tickerSpeed));
  }, [config]);

  const markForDeletion = async (id: number) => {
    await api.del(`/api/advisories/${id}`);
    onSave();
  };

  const unmarkForDeletion = async (id: number) => {
    await api.post(`/api/advisories/${id}/unmark`);
    onSave();
  };

  const saveTickerSpeed = async (text: string) => {
    const val = text === '' ? 0 : Math.max(0, Math.min(120, Number(text)));
    setTickerSpeedText(String(val));
    await api.put('/api/config', { tickerSpeed: val });
    onSave();
  };

  const add = async () => {
    if (!form.message) return;
    await api.post('/api/advisories', form);
    setForm({ label: ADVISORY_PRESETS[0], message: '' });
    reload();
  };

  const startEdit = (a: Advisory) => {
    setEditingId(a.id);
    setEditForm({ label: a.label, message: a.message });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ label: '', message: '' });
  };

  const saveEdit = async (a: Advisory) => {
    await api.put(`/api/advisories/${a.id}`, { label: editForm.label, message: editForm.message });
    setEditingId(null);
    setEditForm({ label: '', message: '' });
    onSave();
  };

  const toggleActive = async (a: Advisory) => {
    await api.put(`/api/advisories/${a.id}`, { active: !a.active });
    onSave();
  };

  return (
    <section style={{ ...styles.section, ...(hasChanged ? styles.sectionChanged : {}) }}>
      <h2 style={styles.sectionTitle}>
        Advisories
        {hasChanged && <span style={styles.changeIndicator}>●</span>}
      </h2>
      <div style={styles.formGroup}>
        <span style={styles.formLabel}>Add New Advisory</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <LabelPicker style={{ width: '200px' }} value={form.label} onChange={label => setForm({ ...form, label })} />
          <input style={{ ...styles.input, flex: 1 }} placeholder="Message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
          <button style={styles.btn} onClick={add}>Add Advisory to Draft</button>
        </div>
      </div>
      {advisories.length > 0 && (
        <div style={styles.listHeader}>
          <span>Current Advisories</span>
          <span style={{ fontSize: '11px', color: '#666' }}>{advisories.length} item{advisories.length !== 1 ? 's' : ''}</span>
        </div>
      )}
      <div>
        {advisories.map(a => {
          const pub = publishedAdvisories?.find(pa => pa.id === a.id);
          const isNewDraft = !pub;
          const isMarkedForDeletion = a.markedForDeletion;
          const isEditing = editingId === a.id;
          const labelChanged = pub && pub.label !== a.label;
          const messageChanged = pub && pub.message !== a.message;
          const activeChanged = pub && pub.active !== a.active;

          return (
            <div key={a.id} style={{ ...styles.listCard, flexDirection: 'column', gap: '8px', opacity: isMarkedForDeletion ? 1 : (a.active ? 1 : 0.5), ...(isMarkedForDeletion ? styles.markedForDeletion : {}) }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                {isNewDraft && !isMarkedForDeletion && <span style={styles.draftIndicator} title="New draft item">●</span>}
                {isMarkedForDeletion && <span style={{ color: '#f44336', fontSize: '10px' }} title="Will be deleted on publish">🗑</span>}
                <div style={{ flex: 1, ...(isMarkedForDeletion ? { textDecoration: 'line-through', opacity: 0.5 } : {}) }}>
                  <span style={{ fontWeight: 700, color: '#e0e0e0' }}>{a.label}</span>
                  <span style={{ color: '#888', margin: '0 8px' }}>—</span>
                  <span style={{ color: '#ccc' }}>{a.message}</span>
                </div>
                <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {isMarkedForDeletion ? (
                    <button style={{ ...styles.smallBtn, background: '#4caf50' }} onClick={() => unmarkForDeletion(a.id)}>Undo</button>
                  ) : (
                    <>
                      {activeChanged && (
                        <span style={{ fontSize: '10px', color: '#ffc107', opacity: 0.8 }}>{pub.active ? 'ON' : 'OFF'} →</span>
                      )}
                      <button style={{ ...styles.smallBtn, background: a.active ? '#4caf50' : '#888' }} onClick={() => toggleActive(a)}>{a.active ? 'ON' : 'OFF'}</button>
                      <button style={{ ...styles.smallBtn, background: isEditing ? '#00838f' : '#1976d2' }} onClick={() => isEditing ? cancelEdit() : startEdit(a)}>✎</button>
                      <button style={{ ...styles.smallBtn, background: '#f44336' }} onClick={() => markForDeletion(a.id)}>✕</button>
                    </>
                  )}
                </span>
              </div>

              {/* Diff indicators */}
              {!isMarkedForDeletion && !isEditing && (labelChanged || messageChanged) && (
                <div style={{ fontSize: '11px', color: '#ffc107', opacity: 0.8, paddingLeft: '16px' }}>
                  {labelChanged && <span>Label was: {pub.label}</span>}
                  {labelChanged && messageChanged && <span style={{ margin: '0 8px' }}>•</span>}
                  {messageChanged && <span>Message was: "{pub.message}"</span>}
                </div>
              )}

              {/* Edit form */}
              {isEditing && !isMarkedForDeletion && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#888', width: '60px' }}>Label:</span>
                    <LabelPicker style={{ flex: 1 }} value={editForm.label} onChange={label => setEditForm({ ...editForm, label })} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#888', width: '60px' }}>Message:</span>
                    <input
                      style={{ ...styles.input, flex: 1 }}
                      value={editForm.message}
                      onChange={e => setEditForm({ ...editForm, message: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(a); if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button style={{ ...styles.smallBtn, background: '#00838f' }} onClick={() => saveEdit(a)}>Save</button>
                    <button style={{ ...styles.smallBtn, background: '#555' }} onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <TrashSection type="advisories" items={trash} labelFn={a => `${a.label}: ${a.message}`} onReload={reload} />

      <div style={{ marginTop: '12px' }}>
        <label style={{ color: '#e0e0e0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Scroll duration
          <input
            style={{ ...styles.input, width: '70px' }}
            type="number"
            min="0"
            max="120"
            value={tickerSpeedText}
            onChange={e => {
              setTickerSpeedText(e.target.value);
              saveTickerSpeed(e.target.value);
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
          seconds (0 = stopped)
        </label>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrap: { background: '#0a1628', minHeight: '100vh' },
  page: { maxWidth: '900px', margin: '0 auto', padding: '24px', color: '#e0e0e0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1a3050', paddingBottom: '16px' },
  link: { color: '#00bcd4', textDecoration: 'none', fontSize: '14px' },
  section: { background: '#132038', borderRadius: '12px', border: '1px solid #1a3050', padding: '20px', marginBottom: '20px' },
  sectionChanged: { borderLeft: '3px solid #ffc107' },
  sectionTitle: { margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' },
  changeIndicator: { color: '#ffc107', fontSize: '12px' },
  changedValue: {
    color: '#ffc107',
    fontSize: '10px',
    opacity: 0.7,
    marginLeft: '4px',
  },
  row: { display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' },
  formGroup: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  formLabel: {
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
    display: 'block',
  },
  input: { background: '#0a1628', border: '1px solid #1a3050', borderRadius: '6px', padding: '8px 12px', color: '#e0e0e0', fontSize: '14px' },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
    paddingBottom: '6px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  listCard: {
    background: 'rgba(0, 0, 0, 0.15)',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '8px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftIndicator: {
    color: '#ffc107',
    fontSize: '8px',
    flexShrink: 0,
    marginRight: '4px',
  },
  markedForDeletion: {
    background: 'rgba(244, 67, 54, 0.1)',
    border: '1px solid rgba(244, 67, 54, 0.3)',
  },
  btn: { background: '#00838f', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 },
  headerBtn: {
    background: 'linear-gradient(135deg, #1a5a3a 0%, #0d3d28 100%)',
    color: '#a8e6cf',
    border: '1px solid #2a7a5a',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    minWidth: '80px',
  },
  headerBtnSecondary: {
    background: 'linear-gradient(135deg, #1a3050 0%, #0d1f35 100%)',
    color: '#8ab4d4',
    border: '1px solid #2a4060',
  },
  smallBtn: { border: 'none', borderRadius: '4px', padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: '12px', marginLeft: '6px' },
  list: { listStyle: 'none', padding: 0 },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a3050' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { width: '90vw', height: '85vh', background: '#132038', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' },
};
