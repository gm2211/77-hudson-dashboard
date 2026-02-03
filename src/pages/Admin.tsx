import { useState, useEffect, useCallback } from 'react';
import type { Service, Event, Advisory, BuildingConfig } from '../types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const api = {
  get: (url: string) => fetch(url).then(r => r.json()),
  post: (url: string, body?: any) => fetch(url, { method: 'POST', headers: JSON_HEADERS, body: body ? JSON.stringify(body) : undefined }).then(r => r.json()),
  put: (url: string, body: any) => fetch(url, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) }).then(r => r.json()),
  del: (url: string) => fetch(url, { method: 'DELETE' }).then(r => r.json()),
};

function useTrash<T>(endpoint: string, onSave: () => void) {
  const [trash, setTrash] = useState<T[]>([]);
  const loadTrash = useCallback(() => { api.get(`${endpoint}/trash`).then(setTrash); }, [endpoint]);
  useEffect(() => { loadTrash(); }, [loadTrash]);
  const reload = () => { onSave(); loadTrash(); };
  const remove = async (id: number) => { await api.del(`${endpoint}/${id}`); reload(); };
  return { trash, reload, remove };
}

export default function Admin() {
  const [services, setServices] = useState<Service[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [config, setConfig] = useState<BuildingConfig | null>(null);

  const load = useCallback(() => {
    api.get('/api/services').then(setServices);
    api.get('/api/events').then(setEvents);
    api.get('/api/advisories').then(setAdvisories);
    api.get('/api/config').then(setConfig);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={styles.pageWrap}>
      <div style={styles.page}>
        <header style={styles.header}>
          <h1>Hudson Dashboard — Admin</h1>
          <a href="/" style={styles.link}>← View Dashboard</a>
        </header>

        <ConfigSection config={config} onSave={load} />
        <ServicesSection services={services} onSave={load} />
        <EventsSection events={events} onSave={load} />
        <AdvisoriesSection advisories={advisories} onSave={load} />
      </div>
    </div>
  );
}

function ConfigSection({ config, onSave }: { config: BuildingConfig | null; onSave: () => void }) {
  const [form, setForm] = useState({ buildingNumber: '', buildingName: '', subtitle: '', scrollSpeed: 30 });

  useEffect(() => {
    if (config) setForm({ buildingNumber: config.buildingNumber, buildingName: config.buildingName, subtitle: config.subtitle, scrollSpeed: config.scrollSpeed });
  }, [config]);

  const save = async () => {
    await api.put('/api/config', form);
    onSave();
  };

  return (
    <section style={styles.section}>
      <h2>Building Config</h2>
      <div style={styles.row}>
        <input style={styles.input} placeholder="Building #" value={form.buildingNumber} onChange={e => setForm({ ...form, buildingNumber: e.target.value })} />
        <input style={styles.input} placeholder="Building Name" value={form.buildingName} onChange={e => setForm({ ...form, buildingName: e.target.value })} />
        <input style={styles.input} placeholder="Subtitle" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
        <label style={{ color: '#e0e0e0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Scroll speed
          <input style={{ ...styles.input, width: '60px' }} type="number" min="0" max="200" value={form.scrollSpeed} onChange={e => setForm({ ...form, scrollSpeed: Number(e.target.value) })} />
          px/s
        </label>
        <button style={styles.btn} onClick={save}>Save</button>
      </div>
    </section>
  );
}

function TrashSection<T extends { id: number }>({ type, items, labelFn, onReload }: { type: string; items: T[]; labelFn: (item: T) => string; onReload: () => void }) {
  const [open, setOpen] = useState(false);

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
      <button style={{ ...styles.smallBtn, background: '#555', marginLeft: 0 }} onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} Trash ({items.length})
      </button>
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

function ServicesSection({ services, onSave }: { services: Service[]; onSave: () => void }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Operational');
  const { trash, reload, remove } = useTrash<Service>('/api/services', onSave);

  const add = async () => {
    if (!name) return;
    await api.post('/api/services', { name, status, sortOrder: services.length });
    setName('');
    reload();
  };

  const toggle = async (s: Service) => {
    const next = s.status === 'Operational' ? 'Maintenance' : s.status === 'Maintenance' ? 'Outage' : 'Operational';
    await api.put(`/api/services/${s.id}`, { status: next });
    onSave();
  };

  return (
    <section style={styles.section}>
      <h2>Services</h2>
      <div style={styles.row}>
        <input style={styles.input} placeholder="Service name" value={name} onChange={e => setName(e.target.value)} />
        <select style={styles.input} value={status} onChange={e => setStatus(e.target.value)}>
          <option>Operational</option>
          <option>Maintenance</option>
          <option>Outage</option>
        </select>
        <button style={styles.btn} onClick={add}>Add</button>
      </div>
      <ul style={styles.list}>
        {services.map(s => (
          <li key={s.id} style={styles.listItem}>
            <span>{s.name}</span>
            <span>
              <button style={{ ...styles.smallBtn, background: s.status === 'Operational' ? '#4caf50' : s.status === 'Maintenance' ? '#ffc107' : '#f44336' }} onClick={() => toggle(s)}>{s.status}</button>
              <button style={{ ...styles.smallBtn, background: '#f44336' }} onClick={() => remove(s.id)}>✕</button>
            </span>
          </li>
        ))}
      </ul>
      <TrashSection type="services" items={trash} labelFn={s => s.name} onReload={reload} />
    </section>
  );
}

const IMAGE_PRESETS = [
  { label: 'Yoga', url: '/images/yoga.jpg' },
  { label: 'Bagels / Brunch', url: '/images/bagels.jpg' },
  { label: 'Tequila / Drinks', url: '/images/tequila.jpg' },
];

function ImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = IMAGE_PRESETS.some(p => p.url === value);
  const isCustom = !!value && !isPreset;
  const [showCustom, setShowCustom] = useState(isCustom);

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

  return (
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
        <input
          style={{ ...styles.input, flex: 1 }}
          placeholder="https://..."
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function EventsSection({ events, onSave }: { events: Event[]; onSave: () => void }) {
  const empty = { title: '', subtitle: '', details: '' as string, imageUrl: '', accentColor: '#00bcd4' };
  const [form, setForm] = useState(empty);
  const { trash, reload, remove } = useTrash<Event>('/api/events', onSave);

  const add = async () => {
    if (!form.title) return;
    await api.post('/api/events', {
      title: form.title,
      subtitle: form.subtitle,
      details: form.details.split('\n').filter(Boolean),
      imageUrl: form.imageUrl,
      accentColor: form.accentColor,
      sortOrder: events.length,
    });
    setForm(empty);
    reload();
  };

  return (
    <section style={styles.section}>
      <h2>Events</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <div style={styles.row}>
          <input style={styles.input} placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <input style={styles.input} placeholder="Subtitle" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
          <input style={{ ...styles.input, width: '80px' }} type="color" value={form.accentColor} onChange={e => setForm({ ...form, accentColor: e.target.value })} />
        </div>
        <ImagePicker value={form.imageUrl} onChange={imageUrl => setForm({ ...form, imageUrl })} />
        <textarea style={{ ...styles.input, height: '60px' }} placeholder="Details (one per line)" value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} />
        <button style={styles.btn} onClick={add}>Add Event</button>
      </div>
      <ul style={styles.list}>
        {events.map(e => (
          <li key={e.id} style={styles.listItem}>
            <span><strong>{e.title}</strong> — {e.subtitle}</span>
            <button style={{ ...styles.smallBtn, background: '#f44336' }} onClick={() => remove(e.id)}>✕</button>
          </li>
        ))}
      </ul>
      <TrashSection type="events" items={trash} labelFn={e => e.title} onReload={reload} />
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
  const [custom, setCustom] = useState(isCustom);

  const handleSelect = (v: string) => {
    if (v === '__custom__') {
      setCustom(true);
      onChange('');
    } else {
      setCustom(false);
      onChange(v);
    }
  };

  if (custom) {
    return (
      <div style={{ display: 'flex', gap: '4px', ...style }}>
        <input
          style={{ ...styles.input, flex: 1, fontWeight: 700 }}
          placeholder="Custom label"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <button style={{ ...styles.smallBtn, background: '#555' }} onClick={() => { setCustom(false); onChange(ADVISORY_PRESETS[0]); }}>✕</button>
      </div>
    );
  }

  return (
    <select style={{ ...styles.input, fontWeight: 700, ...style }} value={value} onChange={e => handleSelect(e.target.value)}>
      {ADVISORY_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
      <option value="__custom__">+ Custom...</option>
    </select>
  );
}

function AdvisoriesSection({ advisories, onSave }: { advisories: Advisory[]; onSave: () => void }) {
  const [form, setForm] = useState({ label: ADVISORY_PRESETS[0], message: '' });
  const { trash, reload, remove } = useTrash<Advisory>('/api/advisories', onSave);

  const add = async () => {
    if (!form.message) return;
    await api.post('/api/advisories', form);
    setForm({ label: ADVISORY_PRESETS[0], message: '' });
    reload();
  };

  const toggleActive = async (a: Advisory) => {
    await api.put(`/api/advisories/${a.id}`, { active: !a.active });
    onSave();
  };

  const update = async (a: Advisory, field: 'label' | 'message', value: string) => {
    await api.put(`/api/advisories/${a.id}`, { [field]: value });
    onSave();
  };

  return (
    <section style={styles.section}>
      <h2>Advisories</h2>
      <div style={styles.row}>
        <LabelPicker style={{ width: '200px' }} value={form.label} onChange={label => setForm({ ...form, label })} />
        <input style={{ ...styles.input, flex: 1 }} placeholder="Message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
        <button style={styles.btn} onClick={add}>Add</button>
      </div>
      <ul style={styles.list}>
        {advisories.map(a => (
          <li key={a.id} style={{ ...styles.listItem, flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', opacity: a.active ? 1 : 0.4 }}>
              <LabelPicker style={{ width: '200px' }} value={a.label} onChange={v => update(a, 'label', v)} />
              <input style={{ ...styles.input, flex: 1 }} defaultValue={a.message} onBlur={e => { if (e.target.value !== a.message) update(a, 'message', e.target.value); }} />
              <button style={{ ...styles.smallBtn, background: a.active ? '#4caf50' : '#888' }} onClick={() => toggleActive(a)}>{a.active ? 'ON' : 'OFF'}</button>
              <button style={{ ...styles.smallBtn, background: '#f44336' }} onClick={() => remove(a.id)}>✕</button>
            </div>
          </li>
        ))}
      </ul>
      <TrashSection type="advisories" items={trash} labelFn={a => `${a.label}: ${a.message}`} onReload={reload} />
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrap: { background: '#0a1628', minHeight: '100vh' },
  page: { maxWidth: '900px', margin: '0 auto', padding: '24px', color: '#e0e0e0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1a3050', paddingBottom: '16px' },
  link: { color: '#00bcd4', textDecoration: 'none' },
  section: { background: '#132038', borderRadius: '12px', border: '1px solid #1a3050', padding: '20px', marginBottom: '20px' },
  row: { display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' },
  input: { background: '#0a1628', border: '1px solid #1a3050', borderRadius: '6px', padding: '8px 12px', color: '#e0e0e0', fontSize: '14px' },
  btn: { background: '#00838f', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 },
  smallBtn: { border: 'none', borderRadius: '4px', padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: '12px', marginLeft: '6px' },
  list: { listStyle: 'none', padding: 0 },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a3050' },
};
