import type { CSSProperties } from 'react';

/** Input style matching the admin theme */
export const inputStyle: CSSProperties = {
  background: '#0a1628',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  padding: '8px 12px',
  color: '#e0e0e0',
  fontSize: '14px',
};

/** Style for inputs with changed values */
export const inputChangedStyle: CSSProperties = {
  borderColor: 'rgba(255, 193, 7, 0.6)',
  boxShadow: '0 0 6px rgba(255, 193, 7, 0.3)',
};

/** Section container style */
export const sectionStyle: CSSProperties = {
  background: '#132038',
  borderRadius: '12px',
  border: '1px solid #1a3050',
  padding: '20px',
  marginBottom: '20px',
};

/** Section with changes indicator */
export const sectionChangedStyle: CSSProperties = {
  borderLeft: '3px solid #ffc107',
};

/** Form group container */
export const formGroupStyle: CSSProperties = {
  background: 'rgba(0, 0, 0, 0.2)',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '16px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
};

/** Form label style */
export const formLabelStyle: CSSProperties = {
  fontSize: '11px',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
  display: 'block',
};

/** List header style */
export const listHeaderStyle: CSSProperties = {
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
export const listCardStyle: CSSProperties = {
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
export const markedForDeletionStyle: CSSProperties = {
  background: 'rgba(244, 67, 54, 0.1)',
};

/** Style for items with changes */
export const itemChangedStyle: CSSProperties = {
  background: 'rgba(255, 193, 7, 0.06)',
  boxShadow: 'inset 0 0 20px rgba(255, 193, 7, 0.10)',
};

/** Draft indicator style */
export const draftIndicatorStyle: CSSProperties = {
  color: '#ffc107',
  fontSize: '8px',
  flexShrink: 0,
  marginRight: '4px',
};
