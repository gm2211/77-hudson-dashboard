/**
 * LabelPicker - Advisory label selector with preset and custom options.
 *
 * PURPOSE:
 * Provides a dropdown for selecting advisory labels from presets (defined in
 * ADVISORY_PRESETS), with option for custom label entry.
 *
 * BEHAVIOR:
 * - Preset options set the label directly from ADVISORY_PRESETS
 * - "+ Custom..." reveals an input field for custom label
 * - Custom label is detected by checking if value is not in presets
 *
 * PROPS:
 * - value: Current label value
 * - onChange: Callback when label changes
 * - style: Optional container styles
 *
 * GOTCHAS / AI AGENT NOTES:
 * - When adding new presets, update ADVISORY_PRESETS in src/constants/status.ts
 * - The __custom__ value is internal only, never passed to onChange
 * - Custom input appears alongside dropdown when custom is selected
 *
 * RELATED FILES:
 * - src/constants/status.ts - ADVISORY_PRESETS array
 */
import type { CSSProperties } from 'react';
import { ADVISORY_PRESETS } from '../../constants';

/** Input style matching the admin theme */
const inputStyle: CSSProperties = {
  background: '#0a1628',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  padding: '8px 12px',
  color: '#e0e0e0',
  fontSize: '14px',
};

interface LabelPickerProps {
  /** Current label value */
  value: string;
  /** Callback when label selection changes */
  onChange: (label: string) => void;
  /** Optional container styles */
  style?: CSSProperties;
}

export function LabelPicker({ value, onChange, style }: LabelPickerProps) {
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
        style={{
          ...inputStyle,
          fontWeight: 700,
          flex: 1,
          height: '100%',
          boxSizing: 'border-box',
        }}
        value={isCustom ? '__custom__' : value}
        onChange={e => handleSelect(e.target.value)}
      >
        {ADVISORY_PRESETS.map(p => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value="__custom__">+ Custom...</option>
      </select>
      {isCustom && (
        <input
          style={{
            ...inputStyle,
            flex: 1,
            fontWeight: 700,
            height: '100%',
            boxSizing: 'border-box',
          }}
          placeholder="Custom label"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
