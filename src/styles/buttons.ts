/**
 * Shared button style definitions for the admin interface.
 *
 * USAGE GUIDE FOR AI AGENTS:
 * - Use smallBtn as the base style for all small buttons
 * - Spread additional variants on top: { ...smallBtn, ...smallBtnDanger }
 * - All buttons use gradient backgrounds for visual consistency
 * - The marginLeft in smallBtn is intentional for button groups - override if needed
 *
 * PATTERN:
 * ```tsx
 * <button style={{ ...smallBtn, ...smallBtnDanger }}>Delete</button>
 * ```
 *
 * COLOR MEANINGS:
 * - Default (smallBtn): Neutral action
 * - Danger: Destructive actions (delete, remove)
 * - Success: Positive actions (save, confirm, undo)
 * - Primary: Main actions (edit, submit)
 * - Info: Informational actions (preview, view)
 */
import type { CSSProperties } from 'react';

/**
 * Base small button style - use as foundation for all small buttons.
 * Includes marginLeft for button groups; override with marginLeft: 0 if first in row.
 */
export const smallBtn: CSSProperties = {
  borderRadius: '4px',
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: '12px',
  marginLeft: '6px',
  background: 'linear-gradient(135deg, #2a3a50 0%, #1a2535 100%)',
  color: '#a0b0c0',
  border: '1px solid #3a4a60',
};

/** Red variant for destructive actions (delete, remove, cancel) */
export const smallBtnDanger: CSSProperties = {
  background: 'linear-gradient(135deg, #5a2a2a 0%, #3d1a1a 100%)',
  color: '#e8a0a0',
  border: '1px solid #7a3a3a',
};

/** Green variant for positive actions (save, confirm, undo deletion) */
export const smallBtnSuccess: CSSProperties = {
  background: 'linear-gradient(135deg, #2a5a3a 0%, #1a3d28 100%)',
  color: '#a0e8b0',
  border: '1px solid #3a7a4a',
};

/** Blue variant for primary actions (edit, submit) */
export const smallBtnPrimary: CSSProperties = {
  background: 'linear-gradient(135deg, #2a4a6a 0%, #1a3050 100%)',
  color: '#a0c8e8',
  border: '1px solid #3a5a7a',
};

/** Teal variant for informational actions (preview, view details) */
export const smallBtnInfo: CSSProperties = {
  background: 'linear-gradient(135deg, #1a5a5a 0%, #0d3d3d 100%)',
  color: '#a0d8d8',
  border: '1px solid #2a7a7a',
};

/**
 * Header button style - larger buttons for page-level actions.
 * Used for Publish, Discard, Preview, History buttons.
 */
export const headerBtn: CSSProperties = {
  background: 'linear-gradient(135deg, #1a5a3a 0%, #0d3d28 100%)',
  color: '#a8e6cf',
  border: '1px solid #2a7a5a',
  borderRadius: '6px',
  padding: '8px 16px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
  minWidth: '80px',
};

/** Secondary header button - less prominent than primary header button */
export const headerBtnSecondary: CSSProperties = {
  background: 'linear-gradient(135deg, #1a3050 0%, #0d1f35 100%)',
  color: '#8ab4d4',
  border: '1px solid #2a4060',
};

/**
 * Standard action button - medium size for form actions.
 * Used for Add, Save, Cancel buttons within forms.
 */
export const btn: CSSProperties = {
  background: '#00838f',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 16px',
  cursor: 'pointer',
  fontWeight: 600,
};
