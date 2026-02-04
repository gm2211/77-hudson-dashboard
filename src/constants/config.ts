// Default values for scroll/ticker speeds (in seconds, higher = slower)
export const DEFAULTS = {
  SCROLL_SPEED: 30,
  TICKER_SPEED: 25,
} as const;

// Theme colors
export const COLORS = {
  // Primary
  TEAL: '#00bcd4',
  TEAL_DARK: '#1a5c5a',
  TEAL_DARKER: '#1a4a48',

  // Backgrounds
  BG_DARK: '#0a1628',
  BG_CARD: '#132038',
  BG_INPUT: '#0a1628',

  // Borders
  BORDER: '#1a3050',
  BORDER_LIGHT: '#2a4060',

  // Advisory ticker
  ADVISORY_BG: '#f5c842',
  ADVISORY_LABEL: '#c0392b',

  // Text
  TEXT_PRIMARY: '#e0e0e0',
  TEXT_SECONDARY: '#888',
  TEXT_MUTED: '#666',

  // Status (also in STATUS_COLORS but repeated for easy access)
  SUCCESS: '#4caf50',
  WARNING: '#ffc107',
  ERROR: '#f44336',
} as const;

// Event card gradient (used in EventCard and EventCardPreview)
export const EVENT_CARD_GRADIENT = {
  withImage: (imageUrl: string) =>
    `linear-gradient(to right, rgba(20,60,58,0.92) 0%, rgba(20,60,58,0.75) 50%, rgba(20,60,58,0.3) 100%), url(${imageUrl})`,
  noImage: 'linear-gradient(135deg, #1a5c5a 0%, #1a4a48 100%)',
} as const;

// Timing constants
export const TIMING = {
  DEBOUNCE_MS: 150,
  ANIMATION_SHAKE_MS: 400,
} as const;
