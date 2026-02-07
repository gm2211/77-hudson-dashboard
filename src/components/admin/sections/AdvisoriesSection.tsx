/**
 * AdvisoriesSection - Advisory ticker management section.
 *
 * PURPOSE:
 * Manages advisory messages shown in the bottom ticker.
 * Supports enabling/disabling individual advisories.
 *
 * BEHAVIOR:
 * - Add/edit advisories via expandable form
 * - Toggle active state with switch (disabled advisories still exist but don't show)
 * - Delete marks items for deletion (soft delete until publish)
 * - Yellow highlight on changed items
 * - Diff indicator shows previous label/message values
 *
 * PROPS:
 * - advisories: Current advisory list
 * - config: Building config (for ticker speed setting)
 * - onSave: Callback after any change (reloads data)
 * - hasChanged: Whether this section has unpublished changes
 * - publishedAdvisories: Last published advisories for diff highlighting
 *
 * GOTCHAS / AI AGENT NOTES:
 * - LabelPicker is an extracted component with preset/custom support
 * - Active toggle is separate from edit - can toggle without opening edit
 * - activeChanged shows arrow indicator (ON → OFF or vice versa)
 *
 * RELATED FILES:
 * - src/pages/Admin.tsx - Parent component
 * - src/types.ts - Advisory type
 * - src/components/admin/LabelPicker.tsx - Label selector
 */
import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Advisory, BuildingConfig } from '../../../types';
import { api } from '../../../utils/api';
import { ADVISORY_PRESETS, DEFAULTS } from '../../../constants';
import {
  smallBtn,
  smallBtnDanger,
  smallBtnSuccess,
  smallBtnPrimary,
  smallBtnInfo,
  btn,
} from '../../../styles';
import { LabelPicker } from '../LabelPicker';

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

/** List header style */
const listHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '12px',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
  paddingBottom: '6px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

/** List card style */
const listCardStyle: CSSProperties = {
  background: 'rgba(0, 0, 0, 0.15)',
  borderRadius: '8px',
  padding: '12px 14px',
  marginBottom: '8px',
  border: '1px solid rgba(255, 255, 255, 0.03)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

/** Style for items marked for deletion */
const markedForDeletionStyle: CSSProperties = {
  background: 'rgba(244, 67, 54, 0.1)',
};

/** Style for items with changes */
const itemChangedStyle: CSSProperties = {
  background: 'rgba(255, 193, 7, 0.06)',
  boxShadow: 'inset 0 0 20px rgba(255, 193, 7, 0.10)',
};

/** Draft indicator style */
const draftIndicatorStyle: CSSProperties = {
  color: '#ffc107',
  fontSize: '8px',
  flexShrink: 0,
  marginRight: '4px',
};

/** Toggle switch style */
const toggleStyle: CSSProperties = {
  width: '36px',
  height: '20px',
  borderRadius: '4px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  cursor: 'pointer',
  position: 'relative',
  padding: 0,
  transition: 'background 0.2s, border-color 0.2s',
};

/** Toggle knob style */
const toggleKnobStyle: CSSProperties = {
  position: 'absolute',
  top: '2px',
  left: '2px',
  width: '14px',
  height: '14px',
  borderRadius: '3px',
  background: 'rgba(255, 255, 255, 0.9)',
  transition: 'transform 0.2s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
};

interface AdvisoriesSectionProps {
  /** Current advisory list */
  advisories: Advisory[];
  /** Building config for ticker speed */
  config: BuildingConfig | null;
  /** Callback after any change */
  onSave: () => void;
  /** Whether this section has unpublished changes */
  hasChanged: boolean;
  /** Last published advisories for diff */
  publishedAdvisories: Advisory[] | null;
}

export function AdvisoriesSection({
  advisories,
  config,
  onSave,
  hasChanged,
  publishedAdvisories,
}: AdvisoriesSectionProps) {
  const empty = { label: ADVISORY_PRESETS[0], message: '' };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formExpanded, setFormExpanded] = useState(false);
  const [tickerSpeedText, setTickerSpeedText] = useState(
    String(config?.tickerSpeed ?? DEFAULTS.TICKER_SPEED)
  );

  const isFormOpen = formExpanded || editingId !== null;

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
    const val = text === '' ? 0 : Math.max(0, Number(text));
    setTickerSpeedText(String(val));
    await api.put('/api/config', { tickerSpeed: val });
    onSave();
  };

  const submit = async () => {
    if (!form.message.trim()) return;
    if (editingId) {
      await api.put(`/api/advisories/${editingId}`, form);
    } else {
      await api.post('/api/advisories', form);
    }
    setForm(empty);
    setEditingId(null);
    setFormExpanded(false);
    onSave();
  };

  const startEdit = (a: Advisory) => {
    setEditingId(a.id);
    setFormExpanded(true);
    setForm({ label: a.label, message: a.message });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormExpanded(false);
    setForm(empty);
  };

  const toggleActive = async (a: Advisory) => {
    await api.put(`/api/advisories/${a.id}`, { active: !a.active });
    onSave();
  };

  return (
    <section style={{ ...sectionStyle, ...(hasChanged ? sectionChangedStyle : {}) }}>
      <h2 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Advisories
        {hasChanged && <span style={{ color: '#ffc107', fontSize: '12px' }}>●</span>}
      </h2>

      {/* Add/Edit Advisory Form */}
      {isFormOpen ? (
        <div style={formGroupStyle}>
          <span style={formLabelStyle}>{editingId ? 'Edit Advisory' : 'Add New Advisory'}</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>Label</span>
              <LabelPicker
                style={{ width: '200px', height: '38px' }}
                value={form.label}
                onChange={label => setForm({ ...form, label })}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>
                Message <span style={{ color: '#f44336' }}>*</span>
              </span>
              <input
                style={{ ...inputStyle, width: '100%', height: '38px', boxSizing: 'border-box' }}
                placeholder="Message"
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') submit();
                }}
              />
            </div>
            <button style={btn} onClick={submit}>
              {editingId ? 'Save Draft' : 'Add Advisory to Draft'}
            </button>
            <button style={{ ...btn, background: '#555' }} onClick={cancelEdit}>
              {editingId ? 'Cancel' : 'Close'}
            </button>
          </div>
        </div>
      ) : (
        <button
          style={{ ...btn, width: '100%', marginBottom: '16px' }}
          onClick={() => setFormExpanded(true)}
        >
          + Add New Advisory
        </button>
      )}

      {/* Advisories List */}
      {advisories.length > 0 && (
        <div style={listHeaderStyle}>
          <span>Current Advisories</span>
          <span style={{ fontSize: '11px', color: '#666' }}>
            {advisories.length} item{advisories.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      <div>
        {advisories.map(a => {
          const pub = publishedAdvisories?.find(pa => pa.id === a.id);
          const isNewDraft = !pub;
          const isMarkedForDeletion = a.markedForDeletion;
          const isBeingEdited = editingId === a.id;
          const labelChanged = pub && pub.label !== a.label;
          const messageChanged = pub && pub.message !== a.message;
          const activeChanged = pub && pub.active !== a.active;
          const hasChanges = !isMarkedForDeletion && !isNewDraft && (labelChanged || messageChanged);

          return (
            <div
              key={a.id}
              style={{
                ...listCardStyle,
                flexDirection: 'column',
                gap: '8px',
                opacity: isMarkedForDeletion ? 1 : a.active ? 1 : 0.5,
                ...(isMarkedForDeletion
                  ? { ...markedForDeletionStyle, border: '1px solid rgba(244, 67, 54, 0.3)' }
                  : {}),
                ...(isBeingEdited ? { border: '2px solid #00838f' } : {}),
                ...(!isBeingEdited && hasChanges ? itemChangedStyle : {}),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
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
                <div
                  style={{
                    flex: 1,
                    ...(isMarkedForDeletion ? { textDecoration: 'line-through', opacity: 0.5 } : {}),
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#e0e0e0' }}>{a.label}</span>
                  <span style={{ color: '#888', margin: '0 8px' }}>—</span>
                  <span style={{ color: '#ccc' }}>{a.message}</span>
                </div>
                <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {isMarkedForDeletion ? (
                    <button
                      style={{ ...smallBtn, ...smallBtnSuccess }}
                      onClick={() => unmarkForDeletion(a.id)}
                    >
                      Undo
                    </button>
                  ) : (
                    <>
                      {activeChanged && (
                        <span style={{ fontSize: '10px', color: '#ffc107', opacity: 0.8 }}>
                          {pub.active ? 'ON' : 'OFF'} →
                        </span>
                      )}
                      <button
                        style={{
                          ...toggleStyle,
                          background: a.active ? 'rgba(76, 175, 80, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                          borderColor: a.active ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 255, 255, 0.15)',
                        }}
                        onClick={() => toggleActive(a)}
                        title={a.active ? 'Active - click to disable' : 'Inactive - click to enable'}
                      >
                        <span
                          style={{
                            ...toggleKnobStyle,
                            transform: a.active ? 'translateX(16px)' : 'translateX(0)',
                          }}
                        />
                      </button>
                      <button
                        style={{ ...smallBtn, ...(isBeingEdited ? smallBtnInfo : smallBtnPrimary) }}
                        onClick={() => (isBeingEdited ? cancelEdit() : startEdit(a))}
                      >
                        ✎
                      </button>
                      <button
                        style={{ ...smallBtn, ...smallBtnDanger }}
                        onClick={() => markForDeletion(a.id)}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </span>
              </div>

              {/* Diff indicators */}
              {!isMarkedForDeletion && (labelChanged || messageChanged) && (
                <div style={{ fontSize: '11px', color: '#ffc107', opacity: 0.8, paddingLeft: '16px' }}>
                  {labelChanged && <span>Label was: {pub.label}</span>}
                  {labelChanged && messageChanged && <span style={{ margin: '0 8px' }}>•</span>}
                  {messageChanged && <span>Message was: "{pub.message}"</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ticker Speed Setting */}
      <div style={{ marginTop: '12px' }}>
        <label
          style={{ color: '#e0e0e0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          Scroll speed
          <input
            style={{ ...inputStyle, width: '70px' }}
            type="number"
            min="0"
            value={tickerSpeedText}
            onChange={e => {
              setTickerSpeedText(e.target.value);
              saveTickerSpeed(e.target.value);
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
