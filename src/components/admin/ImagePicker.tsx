/**
 * ImagePicker - Image selection with presets and custom URL/upload support.
 *
 * PURPOSE:
 * Provides a dropdown for selecting from preset images (defined in IMAGE_PRESETS),
 * or allows custom URL entry with optional file upload capability.
 *
 * BEHAVIOR:
 * - "No image" option clears the value
 * - Preset options set the URL directly from IMAGE_PRESETS
 * - "Custom URL..." reveals an input field and upload button
 * - File uploads go to /api/upload and return the URL
 *
 * PROPS:
 * - value: Current image URL (empty string = no image)
 * - onChange: Callback when image changes
 * - label: Optional label above the picker
 *
 * GOTCHAS / AI AGENT NOTES:
 * - When adding new presets, update IMAGE_PRESETS in src/constants/status.ts
 * - Uploaded images are stored in public/images/uploads/
 * - The __custom__ value is internal only, never passed to onChange
 *
 * RELATED FILES:
 * - src/constants/status.ts - IMAGE_PRESETS array
 * - server/index.ts - /api/upload endpoint
 */
import { useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import { IMAGE_PRESETS } from '../../constants';
import { smallBtn } from '../../styles';

/** Input style matching the admin theme */
const inputStyle: CSSProperties = {
  background: '#0a1628',
  border: '1px solid #1a3050',
  borderRadius: '6px',
  padding: '8px 12px',
  color: '#e0e0e0',
  fontSize: '14px',
};

interface ImagePickerProps {
  /** Current image URL (empty = no image) */
  value: string;
  /** Callback when image selection changes */
  onChange: (url: string) => void;
  /** Optional label displayed above the picker */
  label?: string;
}

export function ImagePicker({ value, onChange, label }: ImagePickerProps) {
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
          style={inputStyle}
          value={showCustom ? '__custom__' : value}
          onChange={e => handleSelect(e.target.value)}
        >
          <option value="">No image</option>
          {IMAGE_PRESETS.map(p => (
            <option key={p.url} value={p.url}>
              {p.label}
            </option>
          ))}
          <option value="__custom__">Custom URL...</option>
        </select>
        {showCustom && (
          <>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="https://..."
              value={value}
              onChange={e => onChange(e.target.value)}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
            <button style={smallBtn} onClick={() => fileRef.current?.click()}>
              Upload
            </button>
          </>
        )}
      </div>
    </div>
  );
}
