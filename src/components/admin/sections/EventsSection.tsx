/**
 * EventsSection - Event card management section.
 *
 * PURPOSE:
 * Manages dashboard event cards (announcements, updates).
 * Shows a card list with edit/preview capabilities.
 *
 * BEHAVIOR:
 * - Add/edit events via expandable form with markdown editor
 * - Preview events as they'll appear on dashboard
 * - Delete marks items for deletion (soft delete until publish)
 * - Yellow highlight on changed items
 * - Title is required (shows validation error with shake animation)
 *
 * PROPS:
 * - events: Current event list
 * - config: Building config (for scroll speed setting)
 * - onSave: Callback after any change (reloads data)
 * - hasChanged: Whether this section has unpublished changes
 * - publishedEvents: Last published events for diff highlighting
 *
 * GOTCHAS / AI AGENT NOTES:
 * - Form details stored as string, converted to array on submit
 * - ImagePicker and MarkdownEditor are extracted components
 * - Preview modal shows EventCardPreview component
 * - shake/field-error CSS classes defined in Admin.tsx
 *
 * RELATED FILES:
 * - src/pages/Admin.tsx - Parent component
 * - src/types.ts - Event type
 * - src/components/admin/MarkdownEditor.tsx - Details editor
 * - src/components/admin/ImagePicker.tsx - Image selector
 * - src/components/admin/EventCardPreview.tsx - Card preview
 */
import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Event, BuildingConfig } from '../../../types';
import { api } from '../../../utils/api';
import { DEFAULTS } from '../../../constants';
import {
  smallBtn,
  smallBtnDanger,
  smallBtnSuccess,
  smallBtnPrimary,
  smallBtnInfo,
  btn,
  modalOverlay,
} from '../../../styles';
import { ImagePicker } from '../ImagePicker';
import { MarkdownEditor } from '../MarkdownEditor';
import { EventCardPreview } from '../EventCardPreview';

/** Input style matching the admin theme */
const inputStyle: CSSProperties = {
  background: '#0a1628',
  border: '1px solid #1a3050',
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
  boxShadow: 'inset 0 0 0 1px rgba(255, 193, 7, 0.5), 0 0 8px rgba(255, 193, 7, 0.2)',
};

/** Draft indicator style */
const draftIndicatorStyle: CSSProperties = {
  color: '#ffc107',
  fontSize: '8px',
  flexShrink: 0,
  marginRight: '4px',
};

interface EventsSectionProps {
  /** Current event list */
  events: Event[];
  /** Building config for scroll speed */
  config: BuildingConfig | null;
  /** Callback after any change */
  onSave: () => void;
  /** Whether this section has unpublished changes */
  hasChanged: boolean;
  /** Last published events for diff */
  publishedEvents: Event[] | null;
}

export function EventsSection({
  events,
  config,
  onSave,
  hasChanged,
  publishedEvents,
}: EventsSectionProps) {
  const empty = { title: '', subtitle: '', details: '- ', imageUrl: '' }; // Start with bullet list
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formExpanded, setFormExpanded] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [previewingForm, setPreviewingForm] = useState(false);
  const [scrollSpeedText, setScrollSpeedText] = useState(
    String(config?.scrollSpeed ?? DEFAULTS.SCROLL_SPEED)
  );
  const [errors, setErrors] = useState<{ title?: boolean }>({});
  const [shake, setShake] = useState(false);

  const isFormOpen = formExpanded || editingId !== null;

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
    const val = text === '' ? 0 : Math.max(0, Number(text));
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
    setFormExpanded(false);
    onSave();
  };

  const startEdit = (e: Event) => {
    setEditingId(e.id);
    setFormExpanded(true);
    setForm({
      title: e.title,
      subtitle: e.subtitle,
      details: (e.details || []).join('\n'),
      imageUrl: e.imageUrl,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormExpanded(false);
    setForm(empty);
  };

  return (
    <section style={{ ...sectionStyle, ...(hasChanged ? sectionChangedStyle : {}) }}>
      <h2 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Events
        {hasChanged && <span style={{ color: '#ffc107', fontSize: '12px' }}>●</span>}
      </h2>

      {/* Add/Edit Event Form */}
      {isFormOpen ? (
        <div style={formGroupStyle}>
          <span style={formLabelStyle}>{editingId ? 'Edit Event' : 'Add New Event'}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10px', color: '#888' }}>
                  Title <span style={{ color: '#f44336' }}>*</span>
                </span>
                <input
                  className={`${errors.title ? 'field-error' : ''} ${shake && errors.title ? 'shake' : ''}`}
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder="Title"
                  value={form.title}
                  onChange={e => {
                    setForm({ ...form, title: e.target.value });
                    setErrors({});
                  }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '10px', color: '#888' }}>Subtitle</span>
                <input
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder="Subtitle"
                  value={form.subtitle}
                  onChange={e => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>
            </div>
            <ImagePicker
              label="Image"
              value={form.imageUrl}
              onChange={imageUrl => setForm({ ...form, imageUrl })}
            />
            <MarkdownEditor
              key={editingId ?? 'new'}
              value={form.details}
              onChange={details => setForm({ ...form, details })}
              cardPreview={{ title: form.title, subtitle: form.subtitle, imageUrl: form.imageUrl }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={btn} onClick={submit}>
                {editingId ? 'Save Draft' : 'Add Event to Draft'}
              </button>
              <button style={{ ...btn, background: '#00838f' }} onClick={() => setPreviewingForm(true)}>
                Preview
              </button>
              <button style={{ ...btn, background: '#555' }} onClick={cancelEdit}>
                {editingId ? 'Cancel' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          style={{ ...btn, width: '100%', marginBottom: '16px' }}
          onClick={() => setFormExpanded(true)}
        >
          + Add New Event
        </button>
      )}

      {/* Form Preview Modal */}
      {previewingForm && (
        <div style={modalOverlay} onClick={() => setPreviewingForm(false)}>
          <div onClick={ev => ev.stopPropagation()} style={{ position: 'relative' }}>
            <EventCardPreview
              title={form.title || 'Untitled Event'}
              subtitle={form.subtitle}
              imageUrl={form.imageUrl}
              details={form.details}
            />
            <button
              style={{ ...smallBtn, position: 'absolute', top: '-8px', right: '-8px', background: '#555' }}
              onClick={() => setPreviewingForm(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      {events.length > 0 && (
        <div style={listHeaderStyle}>
          <span>Current Events</span>
          <span style={{ fontSize: '11px', color: '#666' }}>
            {events.length} item{events.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      <div>
        {events.map(e => {
          const pub = publishedEvents?.find(pe => pe.id === e.id);
          const isNewDraft = !pub;
          const isMarkedForDeletion = e.markedForDeletion;
          const hasChanges =
            !isMarkedForDeletion &&
            !isNewDraft &&
            pub &&
            (pub.title !== e.title ||
              pub.subtitle !== e.subtitle ||
              pub.imageUrl !== e.imageUrl ||
              JSON.stringify(pub.details) !== JSON.stringify(e.details));

          return (
            <div
              key={e.id}
              style={{
                ...listCardStyle,
                ...(isMarkedForDeletion
                  ? { ...markedForDeletionStyle, border: '1px solid rgba(244, 67, 54, 0.3)' }
                  : {}),
                ...(hasChanges ? itemChangedStyle : {}),
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flex: 1,
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
                {e.imageUrl && (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '6px',
                      backgroundImage: `url(${e.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      flexShrink: 0,
                    }}
                  />
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
                  <button
                    style={{ ...smallBtn, ...smallBtnSuccess }}
                    onClick={() => unmarkForDeletion(e.id)}
                  >
                    Undo
                  </button>
                ) : (
                  <>
                    <button
                      style={{ ...smallBtn, ...smallBtnInfo, fontSize: '10px' }}
                      onClick={() => setPreviewEvent(e)}
                    >
                      Preview
                    </button>
                    <button
                      style={{ ...smallBtn, ...smallBtnPrimary }}
                      onClick={() => startEdit(e)}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      style={{ ...smallBtn, ...smallBtnDanger }}
                      onClick={() => markForDeletion(e.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Event Preview Modal */}
      {previewEvent && (
        <div style={modalOverlay} onClick={() => setPreviewEvent(null)}>
          <div onClick={ev => ev.stopPropagation()} style={{ position: 'relative' }}>
            <EventCardPreview
              title={previewEvent.title}
              subtitle={previewEvent.subtitle}
              imageUrl={previewEvent.imageUrl}
              details={previewEvent.details.join('\n')}
            />
            <button
              style={{ ...smallBtn, position: 'absolute', top: '-8px', right: '-8px', background: '#555' }}
              onClick={() => setPreviewEvent(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Scroll Speed Setting */}
      <div style={{ marginTop: '12px' }}>
        <label
          style={{ color: '#e0e0e0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          Scroll speed
          <input
            style={{ ...inputStyle, width: '70px' }}
            type="number"
            min="0"
            value={scrollSpeedText}
            onChange={e => {
              setScrollSpeedText(e.target.value);
              saveScrollSpeed(e.target.value);
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
