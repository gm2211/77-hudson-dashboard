/**
 * ServicesSection - Service status management section.
 *
 * PURPOSE:
 * Manages building service statuses (elevators, HVAC, etc).
 * Shows a table with inline status editing and notes.
 *
 * BEHAVIOR:
 * - Add new services via expandable form
 * - Inline status dropdown for quick changes
 * - Inline notes editing with click-to-expand
 * - Delete marks items for deletion (soft delete until publish)
 * - Yellow highlight on changed items
 *
 * PROPS:
 * - services: Current service list
 * - config: Building config (for scroll speed setting)
 * - onSave: Callback after any change (reloads data)
 * - hasChanged: Whether this section has unpublished changes
 * - publishedServices: Last published services for diff highlighting
 *
 * GOTCHAS / AI AGENT NOTES:
 * - Status changes update lastChecked timestamp automatically
 * - Notes editing uses local state until Enter/click confirm
 * - markedForDeletion shows strikethrough, actual delete on publish
 *
 * RELATED FILES:
 * - src/pages/Admin.tsx - Parent component
 * - src/types.ts - Service type
 * - src/components/admin/StatusSelect.tsx - Status dropdown
 */
import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Service, BuildingConfig } from '../../../types';
import { api } from '../../../utils/api';
import { STATUS_COLORS, DEFAULTS } from '../../../constants';
import { smallBtn, smallBtnDanger, smallBtnSuccess, btn } from '../../../styles';
import { StatusSelect } from '../StatusSelect';

/** Input style matching the admin theme */
const inputStyle: CSSProperties = {
  background: '#0a1628',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  padding: '8px 12px',
  color: '#e0e0e0',
  fontSize: '14px',
};

/** Section container style */
const sectionStyle: CSSProperties = {
  background: '#132038',
  borderRadius: '12px',
  border: '1px solid #1a3050',
  padding: '20px',
  marginBottom: '20px',
};

/** Section with changes indicator */
const sectionChangedStyle: CSSProperties = {
  borderLeft: '3px solid #ffc107',
};

/** Form group container */
const formGroupStyle: CSSProperties = {
  background: 'rgba(0, 0, 0, 0.2)',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '16px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
};

/** Form label style */
const formLabelStyle: CSSProperties = {
  fontSize: '11px',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
  display: 'block',
};

/** Style for items marked for deletion */
const markedForDeletionStyle: CSSProperties = {
  background: 'rgba(244, 67, 54, 0.1)',
};

/** Style for items with changes */
const itemChangedStyle: CSSProperties = {
  background: 'rgba(255, 193, 7, 0.08)',
  boxShadow: 'inset 0 0 12px rgba(255, 193, 7, 0.2), 0 0 8px rgba(255, 193, 7, 0.15)',
};

/** Draft indicator style */
const draftIndicatorStyle: CSSProperties = {
  color: '#ffc107',
  fontSize: '8px',
  flexShrink: 0,
  marginRight: '4px',
};

interface ServicesSectionProps {
  /** Current service list */
  services: Service[];
  /** Building config for scroll speed */
  config: BuildingConfig | null;
  /** Callback after any change */
  onSave: () => void;
  /** Whether this section has unpublished changes */
  hasChanged: boolean;
  /** Last published services for diff */
  publishedServices: Service[] | null;
}

export function ServicesSection({
  services,
  config,
  onSave,
  hasChanged,
  publishedServices,
}: ServicesSectionProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Operational');
  const [formExpanded, setFormExpanded] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const [servicesScrollSpeedText, setServicesScrollSpeedText] = useState(
    String(config?.servicesScrollSpeed ?? DEFAULTS.SERVICES_SCROLL_SPEED)
  );

  useEffect(() => {
    if (config) setServicesScrollSpeedText(String(config.servicesScrollSpeed));
  }, [config]);

  const saveServicesScrollSpeed = async (text: string) => {
    const val = text === '' ? 0 : Math.max(0, Number(text));
    setServicesScrollSpeedText(String(val));
    await api.put('/api/config', { servicesScrollSpeed: val });
    onSave();
  };

  const add = async () => {
    if (!name) return;
    await api.post('/api/services', { name, status, sortOrder: services.length });
    setName('');
    setFormExpanded(false);
    onSave();
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
    await api.put(`/api/services/${s.id}`, {
      status: newStatus,
      lastChecked: new Date().toISOString(),
    });
    onSave();
  };

  const updateNotes = async (s: Service, notes: string) => {
    await api.put(`/api/services/${s.id}`, { notes });
    onSave();
  };

  const getPublishedService = (id: number): Service | undefined => {
    return publishedServices?.find(ps => ps.id === id);
  };

  return (
    <section style={{ ...sectionStyle, ...(hasChanged ? sectionChangedStyle : {}) }}>
      <h2 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Services
        {hasChanged && <span style={{ color: '#ffc107', fontSize: '12px' }}>●</span>}
      </h2>

      {/* Add Service Form */}
      {formExpanded ? (
        <div style={formGroupStyle}>
          <span style={formLabelStyle}>Add New Service Status</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              style={inputStyle}
              placeholder="Service name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') add();
              }}
              autoFocus
            />
            <StatusSelect value={status} onChange={setStatus} />
            <button style={btn} onClick={add}>
              Add
            </button>
            <button
              style={{ ...btn, background: '#555' }}
              onClick={() => {
                setFormExpanded(false);
                setName('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          style={{ ...btn, width: '100%', marginBottom: '12px' }}
          onClick={() => setFormExpanded(true)}
        >
          + Add Service
        </button>
      )}

      {/* Services Table */}
      {services.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: '13px',
            background: 'rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(120px, 1fr) 110px 1fr auto',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                fontWeight: 600,
                fontSize: '11px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Service
            </div>
            <div
              style={{
                padding: '8px 12px',
                fontWeight: 600,
                fontSize: '11px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Status
            </div>
            <div
              style={{
                padding: '8px 12px',
                fontWeight: 600,
                fontSize: '11px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Notes
            </div>
            <div
              style={{
                padding: '8px 12px',
                fontWeight: 600,
                fontSize: '11px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textAlign: 'right',
              }}
            ></div>
          </div>

          {/* Service rows */}
          {services.map(s => {
            const pub = getPublishedService(s.id);
            const isNewDraft = !pub;
            const isMarkedForDeletion = s.markedForDeletion;
            const statusChanged = pub && pub.status !== s.status;
            const notesChanged = pub && (s.notes || '') !== (pub.notes || '');
            const hasItemChanges = !isMarkedForDeletion && !isNewDraft && (statusChanged || notesChanged);
            const isExpanded = expandedNotes === s.id && !isMarkedForDeletion;

            return (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(120px, 1fr) 110px 1fr auto',
                  borderTop: isMarkedForDeletion
                    ? '1px solid rgba(244, 67, 54, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.03)',
                  ...(isMarkedForDeletion ? markedForDeletionStyle : {}),
                  ...(hasItemChanges ? itemChangedStyle : {}),
                }}
              >
                {/* Service name */}
                <div
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    ...(isMarkedForDeletion ? { textDecoration: 'line-through', opacity: 0.5 } : {}),
                  }}
                >
                  {isNewDraft && !isMarkedForDeletion && (
                    <span style={draftIndicatorStyle} title="New draft item">
                      ●
                    </span>
                  )}
                  {isMarkedForDeletion && (
                    <span style={{ color: '#f44336', fontSize: '10px' }} title="Will be deleted on publish">
                      🗑
                    </span>
                  )}
                  <span style={{ fontWeight: 500 }}>{s.name}</span>
                </div>

                {/* Status */}
                <div
                  style={{
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '2px',
                  }}
                >
                  {isMarkedForDeletion ? (
                    <span style={{ color: STATUS_COLORS[s.status], opacity: 0.5 }}>{s.status}</span>
                  ) : (
                    <>
                      <StatusSelect
                        value={s.status}
                        onChange={v => changeStatus(s, v)}
                        style={{ padding: '2px 4px', fontSize: '11px' }}
                      />
                      {statusChanged && (
                        <span style={{ fontSize: '9px', color: '#888' }}>
                          was: <span style={{ color: STATUS_COLORS[pub.status] }}>{pub.status}</span>
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Notes */}
                <div
                  style={{
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    minWidth: 0,
                  }}
                >
                  {isMarkedForDeletion ? (
                    <span style={{ fontSize: '11px', color: '#666', opacity: 0.5 }}>{s.notes || '—'}</span>
                  ) : isExpanded ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flex: 1 }}>
                      <input
                        style={{ ...inputStyle, flex: 1, fontSize: '11px', padding: '4px 8px' }}
                        placeholder="Note..."
                        value={editingNotes[s.id] ?? s.notes ?? ''}
                        onChange={e => setEditingNotes({ ...editingNotes, [s.id]: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const newNotes = editingNotes[s.id] ?? s.notes ?? '';
                            updateNotes(s, newNotes);
                            setEditingNotes(prev => {
                              const copy = { ...prev };
                              delete copy[s.id];
                              return copy;
                            });
                            setExpandedNotes(null);
                          } else if (e.key === 'Escape') {
                            setEditingNotes(prev => {
                              const copy = { ...prev };
                              delete copy[s.id];
                              return copy;
                            });
                            setExpandedNotes(null);
                          }
                        }}
                        autoFocus
                      />
                      <button
                        style={{ ...smallBtn, padding: '2px 6px', fontSize: '10px', marginLeft: 0 }}
                        onClick={() => {
                          const newNotes = editingNotes[s.id] ?? s.notes ?? '';
                          updateNotes(s, newNotes);
                          setEditingNotes(prev => {
                            const copy = { ...prev };
                            delete copy[s.id];
                            return copy;
                          });
                          setExpandedNotes(null);
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        color: s.notes ? '#999' : '#555',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                      onClick={() => setExpandedNotes(s.id)}
                      title={s.notes || 'Click to add note'}
                    >
                      {s.notes || '+ note'}
                      {notesChanged && <span style={{ color: '#ffc107', marginLeft: '4px' }}>*</span>}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div
                  style={{
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                  }}
                >
                  {isMarkedForDeletion ? (
                    <button
                      style={{
                        ...smallBtn,
                        ...smallBtnSuccess,
                        padding: '2px 8px',
                        fontSize: '10px',
                        marginLeft: 0,
                      }}
                      onClick={() => unmarkForDeletion(s.id)}
                    >
                      Undo
                    </button>
                  ) : (
                    <button
                      style={{
                        ...smallBtn,
                        ...smallBtnDanger,
                        padding: '2px 6px',
                        fontSize: '10px',
                        marginLeft: 0,
                      }}
                      onClick={() => markForDeletion(s.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scroll Speed Setting */}
      <div style={{ marginTop: '12px' }}>
        <label
          style={{ color: '#e0e0e0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          Page speed
          <input
            style={{ ...inputStyle, width: '70px' }}
            type="number"
            min="0"
            value={servicesScrollSpeedText}
            onChange={e => {
              setServicesScrollSpeedText(e.target.value);
              saveServicesScrollSpeed(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
          seconds (0 = stopped)
        </label>
      </div>
    </section>
  );
}
