/**
 * ConfigSection - Building configuration editor section.
 *
 * PURPOSE:
 * Manages the building identity settings (number, name, subtitle).
 * Auto-saves changes with debounce for smooth editing experience.
 *
 * BEHAVIOR:
 * - Form initializes from config prop on first render only
 * - Changes auto-save after 150ms debounce
 * - Shows yellow highlight on fields changed from published version
 *
 * PROPS:
 * - config: Current building configuration (or null if loading)
 * - onSave: Callback after save completes (refreshes draft status)
 * - hasChanged: Whether this section has unpublished changes
 * - publishedConfig: Last published config for diff highlighting
 *
 * GOTCHAS / AI AGENT NOTES:
 * - Uses initializedRef to prevent re-initializing form when config reloads
 * - onSave doesn't reload config (uses onConfigSave in parent)
 * - String normalization needed for comparison (numbers vs strings)
 *
 * RELATED FILES:
 * - src/pages/Admin.tsx - Parent component
 * - src/types.ts - BuildingConfig type
 * - server/routes/config.ts - API endpoint
 */
import { useState, useEffect, useRef } from 'react';
import type { BuildingConfig } from '../../../types';
import { api } from '../../../utils/api';
import {
  inputStyle, inputChangedStyle, sectionStyle, sectionChangedStyle,
  formGroupStyle, formLabelStyle,
} from '../../../styles';

interface ConfigSectionProps {
  /** Current building configuration */
  config: BuildingConfig | null;
  /** Callback after save completes */
  onSave: (optimistic?: Record<string, unknown>) => void;
  /** Whether this section has unpublished changes */
  hasChanged: boolean;
  /** Last published config for diff comparison */
  publishedConfig: BuildingConfig | null;
}

export function ConfigSection({ config, onSave, hasChanged, publishedConfig }: ConfigSectionProps) {
  const [form, setForm] = useState({ buildingNumber: '', buildingName: '', subtitle: '' });
  const initializedRef = useRef(false);

  // Only initialize form from config on first load
  useEffect(() => {
    if (config && !initializedRef.current) {
      setForm({
        buildingNumber: config.buildingNumber,
        buildingName: config.buildingName,
        subtitle: config.subtitle,
      });
      initializedRef.current = true;
    }
  }, [config]);

  // Auto-save with debounce when form changes
  useEffect(() => {
    if (!initializedRef.current) return;
    const timer = setTimeout(async () => {
      await api.put('/api/config', form);
      onSave(); // Just refreshes draft status, doesn't reload config
    }, 150);
    return () => clearTimeout(timer);
  }, [form, onSave]);

  // Check which fields have changed from published (normalize to strings for comparison)
  const normalize = (v: unknown) => String(v ?? '');
  const numberChanged =
    publishedConfig && normalize(form.buildingNumber) !== normalize(publishedConfig.buildingNumber);
  const nameChanged =
    publishedConfig && normalize(form.buildingName) !== normalize(publishedConfig.buildingName);
  const subtitleChanged =
    publishedConfig && normalize(form.subtitle) !== normalize(publishedConfig.subtitle);

  return (
    <section style={{ ...sectionStyle, ...(hasChanged ? sectionChangedStyle : {}) }}>
      <h2 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Building Config
        {hasChanged && <span style={{ color: '#ffc107', fontSize: '12px' }}>●</span>}
      </h2>
      <div style={{ ...formGroupStyle, marginBottom: 0 }}>
        <span style={formLabelStyle}>Building Details</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            style={{ ...inputStyle, ...(numberChanged ? inputChangedStyle : {}) }}
            placeholder="Building #"
            value={form.buildingNumber}
            onChange={e => setForm({ ...form, buildingNumber: e.target.value })}
          />
          <input
            style={{ ...inputStyle, ...(nameChanged ? inputChangedStyle : {}) }}
            placeholder="Building Name"
            value={form.buildingName}
            onChange={e => setForm({ ...form, buildingName: e.target.value })}
          />
          <input
            style={{ ...inputStyle, flex: 1, ...(subtitleChanged ? inputChangedStyle : {}) }}
            placeholder="Subtitle"
            value={form.subtitle}
            onChange={e => setForm({ ...form, subtitle: e.target.value })}
          />
        </div>
      </div>
    </section>
  );
}
